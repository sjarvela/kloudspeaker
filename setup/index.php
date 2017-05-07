<?php
namespace Kloudspeaker;

require 'autoload.php';
require '../api/autoload.php';
$systemInfo = getKloudspeakerSystemInfo();

class MemoryLogger extends \Monolog\Handler\AbstractProcessingHandler {
	private $entries = [];

    public function __construct($level = Logger::DEBUG, $bubble = true) {
        parent::__construct($level, $bubble);
    }

    protected function write(array $record) {
        $this->entries[] = array(
            'channel' => $record['channel'],
            'level' => $record['level'],
            'message' => $record['formatted'],
            'time' => $record['datetime']->format('U')
        );
    }

    public function getEntries() { return $this->entries; }
}

$config = new Configuration($systemInfo);

$logLevel = $config->isDebug() ? \Monolog\Logger::DEBUG : \Monolog\Logger::INFO;
$ml = new MemoryLogger($logLevel);

$logger = new \Monolog\Logger('kloudspeaker-setup');
$logger->pushHandler($ml);
$logger->pushHandler(new \Monolog\Handler\StreamHandler($systemInfo["root"]."/logs/setup.log", $logLevel));

$app = new Api($config);
$app->initialize(new \KloudspeakerLegacy($config), [ "logger" => function() use ($logger) {
    return $logger;
}]);
$container = $app->getContainer();

autoload_kloudspeaker_setup($container);

if ($container->configuration->is("dev")) {
    require 'DevTools.php';
    $devTools = new \Kloudspeaker\Setup\DevTools($container);
    $devTools->initialize();
}

$webApp = new \Slim\App([
    'settings' => [
        'determineRouteBeforeAppMiddleware' => true
    ]
]);
$webAppContainer = $webApp->getContainer();

if ($systemInfo["error"] != NULL)
    if (count($systemInfo["error"]) > 1) {
        $e = $systemInfo["error"][1];
        $logger->error(Utils::array2str(["msg" => $systemInfo["error"][0] . ": " . $e->getMessage(), "trace" => $e->getTraceAsString()]));
    } else
        $logger->error($systemInfo["error"][0]);

$webAppContainer['view'] = function ($c) {
    $view = new \Slim\Views\Twig('resources/templates', [
        'cache' => false,
        'debug' => true
    ]);
    
    $view->addExtension(new \Slim\Views\TwigExtension($c['router'], $c['request']->getUri()->getBasePath()));

    return $view;
};

/*$webAppContainer['notFoundHandler'] = function ($c) {
    return function ($request, $response) use ($c) {
        return $c->view->render($response, 'notfound.html');
    };
};*/

$webApp->add(function ($request, $response, $next) use ($systemInfo, $ml, $container) {
    if ($systemInfo["error"] != NULL)
        return $this->view->render($response, 'error.html', [
            'system' => $systemInfo,
            'error' => $systemInfo["error"][0],
            'log' => $ml->getEntries()
        ]);

    $route = $request->getAttribute('route');
    if (empty($route)) {
        return $this->view->render($response, 'notfound.html');
    }
    
    if (!$systemInfo["config_exists"] and $request->getUri()->getPath() != 'config') {
        $container->logger->info("Redirect to config from ".$request->getUri()->getPath());
        return $response->withRedirect($this->get('router')->pathFor('config'));
    }

    return $next($request, $response);
});

$webApp->get('/', function ($request, $response, $args) use ($systemInfo, $ml, $container) {
    return $this->view->render($response, 'index.html', [
        'system' => $systemInfo,
        'log' => $ml->getEntries()
    ]);
})->setName('root');

$webApp->get('/install/', function ($request, $response, $args) use ($systemInfo, $ml, $container) {
	$result = $container->commands->execute("installer:check", [], []);

	$container->logger->info(Utils::array2str($result));

    return $this->view->render($response, 'install.html', [
        'system' => $systemInfo,
        'result' => $result,
        'log' => $ml->getEntries()
    ]);
})->setName('install');

$webApp->post('/install/', function ($request, $response, $args) use ($systemInfo, $ml, $container) {
    $result = $container->commands->execute("installer:perform", [], []);

    $container->logger->debug(Utils::array2str($result));

    return $this->view->render($response, 'perform_install.html', [
        'system' => $systemInfo,
        'result' => $result,
        'error' => $request->getParam("error"),
        'log' => $ml->getEntries()
    ]);
});

$webApp->get('/config', function ($request, $response, $args) use ($systemInfo, $ml, $webAppContainer, $container) {
    return $this->view->render($response, 'configure.html', [
        'log' => $ml->getEntries(),
        'systemInfo' => $systemInfo
    ]);
})->setName('config');

$webApp->post('/config', function ($request, $response, $args) use ($systemInfo, $ml, $webAppContainer, $container) {
    $container->logger->info("Save config". Utils::array2str($request->getParsedBody()));

    $values = $request->getParsedBody();
    $error = FALSE;

    if (!isset($values["dsn"]) or strlen($values["dsn"]) == 0 or !isset($values["username"]) or strlen($values["username"]) == 0 or !isset($values["password"]) or strlen($values["password"]) == 0)
        $error = ["missing_config", ""];
    else {
        $conn = $container->dbfactory->checkConnection($values);
        if (!$conn["connection"]) {
            $container->logger->error("Cannot connect to database: ".$conn["reason"]);
            $error = ["invalid_db_config", $conn["reason"]];
        } else {
            $container->installer->createConfiguration(["db.dsn" => $values["dsn"], "db.username" => $values["username"], "db.password" => $values["password"]]);
        }
    }

    if ($error) {
        return $this->view->render($response, 'configure.html', [
            'values' => $values,
            'error' => $error,
            'systemInfo' => $systemInfo,
            'log' => $ml->getEntries()
        ]);
    } else
        return $response->withRedirect($webAppContainer->get('router')->pathFor('root'));
});

$webApp->run();