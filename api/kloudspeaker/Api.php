<?php
namespace Kloudspeaker;

class Api extends \Slim\App {
    public function __construct($config, $slimConfig = []) {
        parent::__construct([
            'settings' => array_merge([
                'determineRouteBeforeAppMiddleware' => true,
                'displayErrorDetails' => true                
            ], $slimConfig)
        ]);
        $this->config = $config;
    }

    private function doRespond($response) {
        $container = $this->getContainer();
        $out = $container->out;

        if ($out->error) {
            $container->logger->error("ERROR", $this->out->error["error"]);
            return $response->withJson(["success" => FALSE, "error" => $out->error["error"]], $out->error["http_code"]);
        }
        if ($container->out->result)
            return $response->withJson(["success" => TRUE, "result" => $out->result])->withHeader('Set-Cookie', $container->cookie->toHeaders());

        return $response;
    }

    public function initialize($legacy, $overwrite = NULL) {
        $config = $this->config;

        $this->add(new \RKA\Middleware\IpAddress(true));

        $t = $this;

        $this->add(function ($request, $response, $next) use ($legacy, $t) {
            $this->session->initialize($request);

            $route = $request->getAttribute('route');
            
            if (empty($route)) {
                if ($legacy->handleRequest($request))
                    return $t->doRespond($response);

                throw new KloudspeakerException("Route not found", Errors::InvalidRequest);
            }

            $next($request, $response);

            return $t->doRespond($response);
        });

        $container = $this->getContainer();

        $container['phpErrorHandler'] = function ($c) {
            return function ($request, $response, $error) use ($c) {
                $c['logger']->error("PHP Error", ["error" => $error]);
                return $c['response']->withJson(["success" => FALSE, "error" => $error = ["code" => Errors::Unknown, "msg" => "Unknown error"]], HttpCodes::INTERNAL_ERROR);
            };
        };
        $container['errorHandler'] = function ($c) {
            return function ($request, $response, $exception) use ($c) {
                $httpCode = HttpCodes::INTERNAL_ERROR;
                $error = ["code" => Errors::Unknown, "msg" => "Unknown error"];

                if (is_a($exception, "Kloudspeaker\KloudspeakerException")) {
                    $httpCode = $exception->getHttpCode();
                    $error = ["code" => $exception->getErrorCode(), "msg" => $exception->getMessage(), "result" => $exception->getResult()];
                    $c['logger']->error("Application Exception", ["error" => $error, "trace" => $exception->getTraceAsString()]);
                } else if (is_a($exception, "ServiceException")) {
                    //legacy
                    $httpCode = $exception->getHttpCode();
                    $error = ["code" => $exception->getErrorCode(), "msg" => $exception->type() . "/" . $exception->getMessage(), "result" => $exception->getResult()];
                    $c['logger']->error("Application Exception", ["error" => $error, "trace" => $exception->getTraceAsString()]);
                } else {
                    $c['logger']->error("Unknown Exception", ["code" => $exception->getCode(), "msg" => $exception->getMessage(), "trace" => $exception->getTraceAsString()]);
                }

                return $c['response']->withJson(["success" => FALSE, "error" => $error], $httpCode);
            };
        };

        $container['out'] = function($c) {
            return new AppResponse();
        };

        $container['logger'] = function($c) use ($config, $overwrite) {
            if ($overwrite != NULL and array_key_exists("logger", $overwrite))
                return $overwrite["logger"];

            $logger = new \Monolog\Logger('kloudspeaker');
            $logLevel = $config->isDebug() ? \Monolog\Logger::DEBUG : \Monolog\Logger::INFO;
            $fileHandler = new \Monolog\Handler\StreamHandler("../api.log", $logLevel);
            $logger->pushHandler($fileHandler);
            return $logger;
        };

        $container['configuration'] = function ($container) use ($config) {
            return $config;
        };

        $container['session'] = function ($container) {
            return new \Kloudspeaker\Session($container);
        };

        $container['authentication'] = function ($container) {
            return new \Kloudspeaker\Authentication($container);
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

        $container['features'] = function ($container) use ($config) {
            return new \Kloudspeaker\Features($config);
        };

        $container['plugins'] = function ($container) use ($config) {
            return new \Kloudspeaker\Plugins($container);
        };

        $container['filesystem'] = function ($container) use ($legacy) {
            return $legacy->env()->filesystem();
        };

        $container['permissions'] = function ($container) use ($legacy) {
            return $legacy->env()->permissions();
        };

        $container['db'] = function ($container) use ($config) {
            $dbConfig = $config->get("db");
            $db = new \PDO($dbConfig["dsn"], $dbConfig["user"], $dbConfig["password"]);
            return new \Kloudspeaker\Database\Database($db, $container->logger);
        };

        $container['cookie'] = function($c){
            $request = $c->get('request');
            $cp = $request->getCookieParams();
            //$c->logger->debug("Cookie ".Utils::array2str($cp));
            return new \Slim\Http\Cookies($cp);
        };

        $container['auth_pw'] = function($c){
            return new \Kloudspeaker\Auth\PasswordAuth($c);
        };

        $load = $config->get('load_modules', []);
        foreach ($load as $lm) {
            $this->loadModule($lm);
        }

        $legacy->initialize($this);
    }

     public function initializeDefaultRoutes() {
        $this->loadModule("Routes/Session:\Kloudspeaker\Route\Session");
     }

     public function loadModule($m) {
        $file = NULL;
        $cls = $m;
        if (strpos($m, ":") !== FALSE) {
            $parts = explode(":", $m);
            $file = $parts[0];
            if (!Utils::strEndsWith($file, ".php"))
                $file .= ".php";
            $cls = $parts[1];
        }
        if ($file != NULL and strlen($file) > 0)
            require_once $file;

        $cls = new $cls();
        $this->addModule($cls);
     }

    public function addModule($m) {
        $setup = new ModuleSetup($this);

        if (is_callable($m)) {
            $m($setup);
        } elseif (is_object($m)) {
            $m->initialize($setup);
        }
     }
}

class ModuleSetup {
    public function __construct($app) {
        $this->app = $app;
    }

    public function route($name, $cb) {
        //TODO validate
        $n = $name;
        if (!Utils::strStartsWith($name, "/")) $n = '/'.$n;

        $this->app->group($n, $cb);
    }
}

abstract class Errors {
    const Unknown = 0;

    const InvalidRequest = -1;
    const InvalidConfiguration = -2;
    const FeatureNotEnabled = -3;

    const NotAuthenticated = -100;
}

abstract class HttpCodes {
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

    public function __construct($message = "Unknown error", $errorCode = 0, $httpCode = 0, $result = NULL) {
        parent::__construct($message);
        $this->httpCode = $this->resolveHttpCode($httpCode, $errorCode);
        $this->errorCode = $errorCode;
        $this->result = $result; 
    }

    private function resolveHttpCode($httpCode, $errorCode) {
        if ($httpCode != 0)
            return $httpCode;
        if ($errorCode === Errors::NotAuthenticated)
            return HttpCodes::FORBIDDEN;
        //TODO map error codes to http codes
        return HttpCodes::INTERNAL_ERROR;
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