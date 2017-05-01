<?php
namespace Kloudspeaker;

if (!file_exists("../configuration.php")) {
	die("{ success: false, error: { code: -1, msg: 'Configuration missing' } }");
}

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/auto/autoload.php';
require 'autoload.php';
//require 'Routes/Session.php';

include "../configuration.php";
include "Version.info.php";
global $CONFIGURATION, $VERSION, $REVISION;

if (!isset($CONFIGURATION)) {
	die("{ success: false, error: { code: ".Errors::InvalidConfiguration.", msg: 'Configuration missing' } }");
}

$config = new Configuration($CONFIGURATION, ["version" => $VERSION, "revision" => $REVISION]);
$app = new Api($config);
$app->initialize(new \KloudspeakerLegacy($config));

// routes
$app->initializeDefaultRoutes();

$app->run();