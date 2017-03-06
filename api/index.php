<?php
namespace Kloudspeaker;

if (!file_exists("../configuration.php")) {
	die("{ success: false, error: { code: -1, msg: 'Configuration missing' } }");
}

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';
require 'Kloudspeaker/Api.php';
require 'Kloudspeaker/Configuration.php';
require 'Kloudspeaker/Utils.php';
require 'Kloudspeaker/legacy/Legacy.php';
require 'Kloudspeaker/Authentication.php';
require 'Kloudspeaker/Features.php';
require 'Kloudspeaker/Session.php';
require 'Kloudspeaker/DB.php';
require 'Kloudspeaker/Settings.php';
require 'Kloudspeaker/Formatters.php';
require 'Kloudspeaker/Repository/UserRepository.php';
require 'Kloudspeaker/Repository/SessionRepository.php';
require 'Kloudspeaker/Auth/PasswordAuth.php';
require 'Kloudspeaker/Auth/PasswordHash.php';

include "../configuration.php";
include "Version.info.php";
global $CONFIGURATION, $VERSION, $REVISION;

if (!isset($CONFIGURATION)) {
	die("{ success: false, error: { code: ".Errors::InvalidConfiguration.", msg: 'Configuration missing' } }");
}

$config = new Configuration($CONFIGURATION, ["version" => $VERSION, "revision" => $REVISION]);

$legacy = new \KloudspeakerLegacy($config);
$app = new Api($config);
$app->initialize($legacy);

$container = $app->getContainer();
$legacy->initialize($app, $container);

// routes
require 'routes/Session.php';

$app->run();