<?php
namespace Kloudspeaker;

class Api extends \Slim\App {
	public function __construct($config, $slimConfig = []) {
		parent::__construct([
			'settings' => array_merge([
				'determineRouteBeforeAppMiddleware' => true,
				'displayErrorDetails' => true,
			], $slimConfig),
		]);
		$this->config = $config;
	}

	private function doRespond($response) {
		$container = $this->getContainer();
		$out = $container->out;

		if ($out->error) {
			$container->logger->error("ERROR", ["error" => $out->error]);
			return $response->withJson(["success" => FALSE, "error" => $out->error["error"]], $out->error["http_code"]);
		}
		if ($container->out->result) {
			return $response->withJson(["success" => TRUE, "result" => $out->result])->withHeader('Set-Cookie', $container->cookie->toHeaders());
		}

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
				if ($legacy->handleRequest($request)) {
					return $t->doRespond($response);
				}

				throw new KloudspeakerException("Route not found", Errors::InvalidRequest);
			}

			return $t->doRespond($next($request, $response));
		});

		$container = $this->getContainer();

		$container['phpErrorHandler'] = function ($c) use ($overwrite) {
			if ($overwrite != NULL and array_key_exists("phpErrorHandler", $overwrite)) {
				return $overwrite["phpErrorHandler"];
			}

			return function ($request, $response, $error) use ($c) {
				$c['logger']->error("PHP Error", ["error" => $error]);
				return $c['response']->withJson(["success" => FALSE, "error" => $error = ["code" => Errors::Unknown, "msg" => "Unknown error"]], HttpCodes::INTERNAL_ERROR);
			};
		};
		$container['errorHandler'] = function ($c) use ($overwrite) {
			if ($overwrite != NULL and array_key_exists("errorHandler", $overwrite)) {
				return $overwrite["errorHandler"];
			}

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

		$container['api'] = function ($c) use ($t) {
			return $t;
		};

		$container['out'] = function ($c) {
			return new AppResponse();
		};

		$container['logger'] = function ($c) use ($config, $overwrite) {
			if ($overwrite != NULL and array_key_exists("logger", $overwrite)) {
				return $overwrite["logger"]();
			}

			$logger = new \Monolog\Logger('kloudspeaker');
			$logLevel = $config->isDebug() ? \Monolog\Logger::DEBUG : \Monolog\Logger::INFO;
			$logger->pushHandler(new \Monolog\Handler\StreamHandler($c->configuration->getInstallationRoot() . "/logs/api.log", $logLevel));
			return $logger;
		};

		$container['configuration'] = function ($container) use ($config) {
			return $config;
		};

		$container['session'] = function ($container) {
			return new \Kloudspeaker\Session($container);
		};

		$container['commands'] = function ($container) {
			return new \Kloudspeaker\Command\CommandManager($container);
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

		$container['dbfactory'] = function ($container) use ($config) {
			return new \Kloudspeaker\Database\DatabaseFactory($container);
		};

		$container['db'] = function ($container) use ($config) {
			return $container->dbfactory->createDb();
		};

		$container['cookie'] = function ($c) {
			$request = $c->get('request');
			$cp = $request->getCookieParams();
			return new \Slim\Http\Cookies($cp);
		};

		$container['passwordhash'] = function ($c) {
			$config = $c->configuration;
			return new \Kloudspeaker\Auth\PasswordHash($config->get('server_hash_salt', 'KLOUDSPEAKER_SERVER_SALT'), $config->get('no_udev_random', FALSE));
		};

		$container['auth_pw'] = function ($c) {
			return new \Kloudspeaker\Auth\PasswordAuth($c);
		};

		$container['now'] = function ($c) use ($config) {
			if (array_key_exists('now', $config)) {
				return $config['now']();
			}

			return time();
		};

		$container['itemIdProvider'] = function ($c) {
			return new \Kloudspeaker\Filesystem\ItemIdProvider($c);
		};

		$container['filesystem'] = function ($c) use ($legacy) {
			return $legacy->env()->filesystem();
		};

		$container['legacy'] = $legacy;

		if ($config->isSystemConfigured()) {
			$load = $config->get('load_modules', []);
			foreach ($load as $lm) {
				$this->loadModule($lm);
			}

			$legacy->initialize($this);

			$container->plugins->initialize();
		}
	}

	public function initializeDefaultRoutes() {
		$this->loadModule("Kloudspeaker/Routes/Session");
	}

	public function loadModule($m, $o = NULL, $setup = TRUE) {
		// "name" -> requires "name.php" and creates class "name"
		// name[cls] -> requires "name.php" and creates class "cls"
		$type = NULL;
		$file = NULL;
		$cls = NULL;
		if (strpos($m, ":") !== FALSE) {
			list($type, $file) = explode(":", $m, 2);
		} else {
			$file = $m;
		}

		if (Utils::strEndsWith($file, "]")) {
			$s = strpos($file, "[");
			$file = substr($file, 0, $s);
			$cls = substr($file, $s, -1);
		} /*else if (strpos($file, "/") !== FALSE) {
	            $cls = str_replace("/", "\\", $file);
	            if (!Utils::strStartsWith($cls, "\\"))
	                $cls = "\\".$cls;
*/

		if ($type == "plugin") {
			// Plugin type module behaviour:
			//
			// If not defined, plugin class file assumed to be "name.plugin.php"
			// If not defined, plugin class name assumed to be "NamePlugin"

			if ($file != NULL) {
				if (!Utils::strEndsWith($file, ".php")) {
					$name = $file;
					if (strpos($file, "/") !== FALSE) {
						$parts = explode("/", $file);
						$name = $parts[count($parts) - 1];
					}

					if ($cls == NULL) {
						$cls = str_replace("/", "\\", $file) . "\\" . $name . "Plugin";
					}

					$file .= "/" . $name . ".plugin.php";
				} else {
					if ($cls == NULL) {
						//TODO extract class name from file (remove .php or .plugin.php and possible folder/package)
					}
				}
			}
		} else {
			// Default module behaviour

			if ($file != NULL) {
				if ($cls == NULL) {
					$cls = str_replace("/", "\\", $file);
				}

				if (!Utils::strEndsWith($file, ".php")) {
					$file .= ".php";
				}

			}
		}
		//TODO other module type behaviours

		if (!Utils::strStartsWith($cls, "\\")) {
			$cls = "\\" . $cls;
		}

		if (Utils::strEndsWith($cls, ".php")) {
			$cls = substr($cls, 0, -4);
		}

		$this->getContainer()->logger->debug("Loading module $m -> type=$type file=$file class=$cls");

		if ($file != NULL and strlen($file) > 0) {
			require_once $file;
		}

		if ($o !== NULL) {
			$cls = new $cls($this->getContainer(), $o);
		} else {
			$cls = new $cls($this->getContainer());
		}

		return $setup ? $this->setupModule($cls, $type) : $cls;
	}

	public function setupModule($m, $type) {
		$setup = new ModuleSetup($this);

		if (is_callable($m)) {
			return $m($setup);
		} elseif (is_object($m)) {
			$m->initialize($setup);
			return $m;
		}
		return NULL;
	}

	public function serveFile($response, $request, $file) {
		$info = pathinfo($file);
		$this->getContainer()->logger->debug("Serving file", ["file" => $file, "info" => $info]);
		$s = new \GuzzleHttp\Psr7\LazyOpenStream($file, 'r');
		$mime = $this->getMimeType(strtolower($info["extension"]));
		return $response->withHeader('Content-Type', $mime)->withBody($s);
	}

	private function getMimeType($type) {
		switch ($type) {
		case 'css':
			return 'text/css';
		case 'js':
			return 'application/javascript';
		default:
			return 'text/plain';
		}
	}
}

class ModuleSetup {
	public function __construct($app) {
		$this->app = $app;
	}

	public function container() {
		return $this->app->getContainer();
	}

	public function route($name, $cb) {
		//TODO validate
		$n = $name;
		if (!Utils::strStartsWith($name, "/")) {
			$n = '/' . $n;
		}

		$this->app->group($n, $cb);
	}
}

abstract class Errors {
	const Unknown = 0;

	const InvalidRequest = -1;
	const InvalidConfiguration = -2;
	const FeatureNotEnabled = -3;
	const InsufficientPermissions = -4;

	const NotAuthenticated = -100;
}

abstract class HttpCodes {
	const OK = 200;

	const BAD_REQUEST = 400;
	const FORBIDDEN = 403;
	const NOT_FOUND = 404;
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
		if ($httpCode != 0) {
			return $httpCode;
		}

		if ($errorCode === Errors::NotAuthenticated) {
			return HttpCodes::FORBIDDEN;
		}

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

class InsufficientPermissionsException extends KloudspeakerException {
	public function __construct($message = "Insufficient permissions", $result = NULL) {
		parent::__construct($message, Errors::InsufficientPermissions, HttpCodes::FORBIDDEN, $result);
	}
}

class AuthRoute {
	public function __construct($container) {
		$this->container = $container;
	}

	public function __invoke($request, $response, $next) {
		if (!$this->container->session->isLoggedIn()) {
			throw new NotAuthenticatedException("Not authenticated " . $request->getAttribute('route')->getName());
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