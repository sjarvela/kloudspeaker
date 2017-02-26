<?php

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use \Kloudspeaker\Auth;

require 'vendor/autoload.php';
include 'Kloudspeaker/Auth.php';

$config = [
    'settings' => [
        // Only set this if you need access to route within middleware
        'determineRouteBeforeAppMiddleware' => true
    ]
];
$app = new Slim\App($config);

$app->add(function ($request, $response, $next) {
	$route = $request->getAttribute('route');
    // return NotFound for non existent route
    if (empty($route)) return $response->withJson(array('error' => 'not_found'));

	$this->logger->debug("ROUTE ".$route->getName());

    $next($request, $response);

    $this->logger->debug("END");

    if ($this->out->error) {
		$this->logger->addError("ERROR", $this->out->error["error"]);
    	return $response->withJson($this->out->error["error"], $this->out->error["http_code"]);
    }
    if ($this->out->result)
    	return $response->withJson($this->out->result);
});

$container = $app->getContainer();
$container['out'] = function($c) {
    $response = new AppResponse();
    return $response;
};

$container['errorHandler'] = function ($c) {
    return function ($request, $response, $exception) use ($c) {
    	$httpCode = 500;
    	$error = ["code" => 0, "msg" => "Unknown error"];

    	if (is_a($exception, "KloudspeakerException")) {
    		$httpCode = $exception->getHttpCode();
    		$error = ["code" => $exception->getErrorCode(), "msg" => $exception->getMessage(), "result" => $exception->getResult()];
    		$c['logger']->error("Application Exception", $error);
    	} else {
    		$c['logger']->error("Unknown Exception", ["code" => $exception->getCode(), "msg" => $exception->getMessage(), "trace" => $exception->getTraceAsString()]);
    	}

    	return $c['response']->withJson($error, $httpCode);
    };
};

$container['logger'] = function($c) {
    $logger = new \Monolog\Logger('kloudspeaker');
    $file_handler = new \Monolog\Handler\StreamHandler("../server.log");
    $logger->pushHandler($file_handler);
    return $logger;
};

$container['auth'] = function ($container) {
	return new Auth($container);
};

abstract class Errors
{
    const NotAuthenticated = 1;
}

abstract class HttpCodes
{
    const OK = 200;
    const NOT_AUTHORIZED = 403;
}

class KloudspeakerException extends Exception {
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
        parent::__construct($message, Errors::NotAuthenticated, HttpCodes::NOT_AUTHORIZED, $result);
    }
}

class AuthRoute {
    public function __construct($container) {
        $this->container = $container;
    }

    public function __invoke($request, $response, $next) {
    	if (!$this->container->auth->isLoggedIn()) {
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