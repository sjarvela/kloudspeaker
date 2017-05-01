<?php
namespace Kloudspeaker;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'system.php';

$systemInfo = getKloudspeakerSystemInfo();

if (!$systemInfo["config_exists"]) {
	die("{ success: false, error: { code: -1, msg: 'Configuration missing' } }");
}

require 'vendor/auto/autoload.php';
require 'autoload.php';

$config = new Configuration($systemInfo);
$app = new Api($config);
$app->initialize(new \KloudspeakerLegacy($config));

// routes
$app->initializeDefaultRoutes();

$app->run();