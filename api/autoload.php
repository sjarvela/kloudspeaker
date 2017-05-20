<?php
$KLOUDSPEAKER_ROOT = realpath(dirname(__FILE__) . "/../");
$KLOUDSPEAKER_SITE_FOLDER = $KLOUDSPEAKER_ROOT . DIRECTORY_SEPARATOR . "site" . DIRECTORY_SEPARATOR;
$KLOUDSPEAKER_CONFIG_FILE = $KLOUDSPEAKER_SITE_FOLDER . "configuration.php";
$KLOUDSPEAKER_SYSTEM_INFO = [
	"root" => $KLOUDSPEAKER_ROOT,
	"site_folder" => $KLOUDSPEAKER_SITE_FOLDER,
	"config_file" => $KLOUDSPEAKER_CONFIG_FILE,
	"site_folder_exists" => FALSE,
	"config_exists" => FALSE,
	"config_writable" => FALSE,
	"error" => NULL,
];
$KLOUDSPEAKER_SYSTEM_ERROR = NULL;

set_include_path($KLOUDSPEAKER_SYSTEM_INFO["root"] . DIRECTORY_SEPARATOR . 'site' . PATH_SEPARATOR . $KLOUDSPEAKER_SYSTEM_INFO["root"] . DIRECTORY_SEPARATOR . 'api' . PATH_SEPARATOR . $KLOUDSPEAKER_SYSTEM_INFO["root"] . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'backend' . PATH_SEPARATOR . get_include_path());

require 'vendor/auto/autoload.php';

require_once 'Kloudspeaker/Utils.php';

if (file_exists($KLOUDSPEAKER_SYSTEM_INFO["site_folder"])) {
	$KLOUDSPEAKER_SYSTEM_INFO["site_folder_exists"] = TRUE;

	try {
		if (file_exists($KLOUDSPEAKER_CONFIG_FILE)) {
			$KLOUDSPEAKER_SYSTEM_INFO["config_writable"] = is_writable($KLOUDSPEAKER_CONFIG_FILE);
			include $KLOUDSPEAKER_CONFIG_FILE;
		} else {
			$KLOUDSPEAKER_SYSTEM_INFO["config_writable"] = is_writable($KLOUDSPEAKER_SITE_FOLDER);
		}
	} catch (Exception $e) {
		$KLOUDSPEAKER_SYSTEM_ERROR = ["Error in configuration.php", $e];
	} catch (Throwable $e) {
		$KLOUDSPEAKER_SYSTEM_ERROR = ["Error in configuration.php", $e];
	}
} else {
	$KLOUDSPEAKER_SYSTEM_INFO["config_writable"] = is_writable($KLOUDSPEAKER_ROOT);
}

include "version.info.php";

global $CONFIGURATION, $VERSION, $REVISION;

if ($KLOUDSPEAKER_SYSTEM_ERROR != NULL or !isset($CONFIGURATION) or $CONFIGURATION == NULL) {
	$KLOUDSPEAKER_SYSTEM_INFO = array_merge($KLOUDSPEAKER_SYSTEM_INFO, [
		"config_exists" => FALSE,
		"config" => NULL,
		"error" => $KLOUDSPEAKER_SYSTEM_ERROR,
		"version" => $VERSION,
		"revision" => $REVISION,
	]);
} else {
	$KLOUDSPEAKER_SYSTEM_INFO = array_merge($KLOUDSPEAKER_SYSTEM_INFO, [
		"config_exists" => TRUE,
		"config" => $CONFIGURATION,
		"version" => $VERSION,
		"revision" => $REVISION,
	]);
}

require 'Kloudspeaker/Api.php';
require 'Kloudspeaker/Configuration.php';
require 'Kloudspeaker/Legacy/Legacy.php';
require 'Kloudspeaker/Authentication.php';
require 'Kloudspeaker/Features.php';
require 'Kloudspeaker/Session.php';
require 'Kloudspeaker/Database/DatabaseFactory.php';
require 'Kloudspeaker/Database/DB.php';
require 'Kloudspeaker/Settings.php';
require 'Kloudspeaker/Formatters.php';
require 'Kloudspeaker/Plugins.php';
require 'Kloudspeaker/Plugins/AbstractPlugin.php';
require 'Kloudspeaker/Repository/UserRepository.php';
require 'Kloudspeaker/Repository/SessionRepository.php';
require 'Kloudspeaker/Auth/PasswordAuth.php';
require 'Kloudspeaker/Auth/PasswordHash.php';
require 'Kloudspeaker/Command/CommandManager.php';

function getKloudspeakerSystemInfo() {
	global $KLOUDSPEAKER_SYSTEM_INFO;
	return $KLOUDSPEAKER_SYSTEM_INFO;
}