<?php
namespace Kloudspeaker;

require 'api/vendor/auto/autoload.php';
require 'api/system.php';

$systemInfo = getKloudspeakerSystemInfo();

set_include_path($systemInfo["root"].DIRECTORY_SEPARATOR.'api' . PATH_SEPARATOR . get_include_path());

require 'autoload.php';

$config = new Configuration($systemInfo["config"], ["version" => $systemInfo["version"], "revision" => $systemInfo["revision"]]);

$app = new Api($config);
$app->initialize(new \KloudspeakerLegacy($config));
$container = $app->getContainer();

$webApp = new \Slim\App();
$webAppContainer = $webApp->getContainer();

$webAppContainer['view'] = function ($c) {
    $view = new \Slim\Views\Twig('api/Setup/templates', [
        'cache' => false,
        'debug' => true
    ]);
    
    $basePath = rtrim(str_ireplace('setup.php', '', $c['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new \Slim\Views\TwigExtension($c['router'], $basePath));

    return $view;
};

$webApp->get('/install', function ($request, $response, $args) use ($systemInfo) {
    return $this->view->render($response, 'install.html', [
        'system' => $systemInfo
    ]);
})->setName('install');

$webApp->run();