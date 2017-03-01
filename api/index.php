<?php
namespace Kloudspeaker;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';
//require 'vendor/phpass/PasswordHash.php';
require 'Kloudspeaker/Utils.php';
include 'Kloudspeaker/Auth.php';
include 'Kloudspeaker/Session.php';
include 'Kloudspeaker/DB.php';
include 'Kloudspeaker/Settings.php';
include 'Kloudspeaker/Formatters.php';
include 'Kloudspeaker/Repository/UserRepository.php';
include 'Kloudspeaker/Repository/SessionRepository.php';
include 'Kloudspeaker/Auth/PasswordAuth.php';
include 'Kloudspeaker/Auth/PasswordHash.php';

$config = [
    'settings' => [
        // Only set this if you need access to route within middleware
        'determineRouteBeforeAppMiddleware' => true
    ]
];
$app = new \Slim\App($config);

$app->add(new \RKA\Middleware\IpAddress(true));

$app->add(function ($request, $response, $next) {
	$route = $request->getAttribute('route');
    // return NotFound for non existent route
    if (empty($route)) {
    	throw new KloudspeakerException("Route not found", Errors::InvalidRequest);
    }

    $this->session->initialize($request);

    $next($request, $response);

    if ($this->out->error) {
		$this->logger->error("ERROR", $this->out->error["error"]);
    	return $response->withJson(["success" => FALSE, "error" => $this->out->error["error"]], $this->out->error["http_code"]);
    }
    if ($this->out->result)
    	return $response->withJson(["success" => TRUE, "result" => $this->out->result])->withHeader('Set-Cookie', $this->cookie->toHeaders());
});

$container = $app->getContainer();

$container['errorHandler'] = function ($c) {
    return function ($request, $response, $exception) use ($c) {
    	$httpCode = 500;
    	$error = ["code" => 0, "msg" => "Unknown error"];

    	if (is_a($exception, "Kloudspeaker\KloudspeakerException")) {
    		$httpCode = $exception->getHttpCode();
    		$error = ["code" => $exception->getErrorCode(), "msg" => $exception->getMessage(), "result" => $exception->getResult()];
    		$c['logger']->error("Application Exception", $error);
    	} else {
    		$c['logger']->error("Unknown Exception", ["code" => $exception->getCode(), "msg" => $exception->getMessage(), "trace" => $exception->getTraceAsString()]);
    	}

    	return $c['response']->withJson(["success" => FALSE, "error" => $error], $httpCode);
    };
};

$container['out'] = function($c) {
    return new AppResponse();
};

$container['logger'] = function($c) {
    $logger = new \Monolog\Logger('kloudspeaker');
    $file_handler = new \Monolog\Handler\StreamHandler("../server.log");
    $logger->pushHandler($file_handler);
    return $logger;
};

$container['session'] = function ($container) {
	return new \Kloudspeaker\Session($container);
};

$container['auth'] = function ($container) {
	return new \Kloudspeaker\Auth($container);
};

$container['app_settings'] = function ($container) {
	return new \Kloudspeaker\Settings($container);
};

$container['users'] = function ($container) {
	return new \Kloudspeaker\Repository\UserRepository($container);
};

$container['sessions'] = function ($container) {
	return new \Kloudspeaker\Repository\SessionRepository($container);
};

$container['formatters'] = function ($container) {
	return new \Kloudspeaker\Formatters($container);
};

$container['db'] = function ($container) {
	$dsn = 'mysql:host=localhost;dbname=kloudspeaker;charset=utf8';
	$usr = 'kloudspeaker';
	$pwd = 'kloudspeaker';
	return new \Kloudspeaker\DB\PDODatabase($container->logger, $dsn, $usr, $pwd);
};

$container['cookie'] = function($c){
    $request = $c->get('request');
    $cp = $request->getCookieParams();
    $c->logger->debug("Cookie ".Utils::array2str($cp));
    return new \Slim\Http\Cookies($cp);
};

$container['auth_pw'] = function($c){
    return new \Kloudspeaker\Auth\PasswordAuth($c);
};

abstract class Errors
{
	const InvalidRequest = -1;
    const NotAuthenticated = -100;
}

abstract class HttpCodes
{
    const OK = 200;

    const BAD_REQUEST = 400;
    const FORBIDDEN = 403;
    const NOT_ACCEPTABLE = 406;

    const INTERNAL_ERROR = 500;
}

class KloudspeakerException extends \Exception {
	private $httpCode;
	private $errorCode;
	private $result;

    public function __construct($message = "Unknown error", $errorCode = 0, $httpCode = 500, $result = NULL) {
    	parent::__construct($message);
		$this->httpCode = $httpCode;
		$this->errorCode = $errorCode;
		$this->result = $result; 
    }

    public function getHttpCode() {
    	return $this->httpCode;
    }

    public function getErrorCode() {
    	return $this->errorCode;
    }

    public function getResult() {
    	return $this->result;
    }
}

class NotAuthenticatedException extends KloudspeakerException {
    public function __construct($message = "Not authenticated", $result = NULL) {
        parent::__construct($message, Errors::NotAuthenticated, HttpCodes::FORBIDDEN, $result);
    }
}

class AuthRoute {
    public function __construct($container) {
        $this->container = $container;
    }

    public function __invoke($request, $response, $next) {
    	if (!$this->container->session->isLoggedIn()) {
    		throw new NotAuthenticatedException("Not authenticated ".$request->getAttribute('route')->getName());
    	}

        return $next($request, $response);
    }
}

// routes
require 'routes/session.php';

$app->run();

class AppResponse {
	public $result = NULL;
	public $error = NULL;

	public function success($result) {
		$this->result = $result;
	}

	public function error($msg = "Unknown error", $code = 0, $httpCode = 500, $result = NULL) {
		$this->error = ["http_code" => $httpCode, "error" => ["code" => $code, "msg" => $msg, "result" => $result]];
	}
}