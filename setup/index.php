<?php
namespace Kloudspeaker;

require '../api/vendor/auto/autoload.php';
require '../api/system.php';

$systemInfo = getKloudspeakerSystemInfo();

set_include_path($systemInfo["root"].DIRECTORY_SEPARATOR.'api' . PATH_SEPARATOR . get_include_path());

require 'autoload.php';

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
$logger->pushHandler(new \Monolog\Handler\StreamHandler("setup.log", $logLevel));

$app = new Api($config);
$app->initialize(new \KloudspeakerLegacy($config), [ "logger" => function() use ($logger) {
    return $logger;
}]);
$container = $app->getContainer();

require 'Installer.php';
$installer = new \Kloudspeaker\Setup\Installer($systemInfo, $container);
$installer->initialize();

$webApp = new \Slim\App();
$webAppContainer = $webApp->getContainer();

$webAppContainer['view'] = function ($c) {
    $view = new \Slim\Views\Twig('resources/templates', [
        'cache' => false,
        'debug' => true
    ]);
    
    //$basePath = rtrim(str_ireplace('index.php', '', $c['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new \Slim\Views\TwigExtension($c['router'], $c['request']->getUri()->getBasePath()));

    return $view;
};

$webAppContainer['notFoundHandler'] = function ($c) {
    return function ($request, $response) use ($c) {
        return $c->view->render($response, 'notfound.html');
    };
};

$webApp->get('/', function ($request, $response, $args) use ($systemInfo, $ml, $container) {
    return $this->view->render($response, 'index.html', [
        'system' => $systemInfo,
        'log' => $ml->getEntries()
    ]);
})->setName('root');

$webApp->get('/install/', function ($request, $response, $args) use ($systemInfo, $ml, $container, $installer) {
	$result = $container->commands->execute("installer:check", []);

	//$container->logger->debug(Utils::array2str($result));

    return $this->view->render($response, 'install.html', [
        'system' => $systemInfo,
        'result' => $result,
        'log' => $ml->getEntries()
    ]);
})->setName('install');

$webApp->post('/install/', function ($request, $response, $args) use ($systemInfo, $ml, $container, $installer) {
    $result = $container->commands->execute("installer:perform", []);

    //$container->logger->debug(Utils::array2str($result));

    return $this->view->render($response, 'perform_install.html', [
        'system' => $systemInfo,
        'result' => $result,
        'log' => $ml->getEntries()
    ]);
});

$webApp->run();