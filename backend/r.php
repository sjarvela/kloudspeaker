<?php

/**
 * r.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

date_default_timezone_set("Europe/Helsinki");
require_once "include/Logging.class.php";
require_once "include/Request.class.php";
require_once "include/ResponseHandler.class.php";
require_once "include/OutputHandler.class.php";
require_once "include/Version.info.php";

$responseHandler = NULL;

function globalErrorHandler($errno, $errstr, $errfile, $errline) {
	global $responseHandler;
	$info = "PHP error #" . $errno . ", " . $errstr . " (" . $errfile . ":" . $errline . ")";

	if (Logging::isDebug()) {
		$data = debug_backtrace();
	} else {
		$msg = "Backtrace disabled as it may contain passwords. ";
		$msg .= "Enable 'debug' setting in configuration.php to see ";
		$msg .= "backtrace.";

		$data = array("NOTE" => $msg);
	}

	Logging::logError($info . "\n" . Util::array2str($data));

	if ($responseHandler == NULL) {
		$responseHandler = new ResponseHandler(new OutputHandler());
	}

	$responseHandler->unknownServerError($info);
	die();
}
set_error_handler('globalErrorHandler');

function globalExceptionHandler($e) {
	global $responseHandler;
	Logging::logException($e);
	Logging::logDebug(Util::array2str(debug_backtrace()));
	if ($responseHandler == NULL) {
		$responseHandler = new ResponseHandler(new OutputHandler());
	}

	$responseHandler->unknownServerError($e->getMessage());
	die();
}
set_exception_handler('globalExceptionHandler');

/*function fatalErrorHandler() {
global $responseHandler;
$info = "PHP fatal error: ".Util::array2str(error_get_last());
Logging::logError($info);
if ($responseHandler == NULL) $responseHandler = new ResponseHandler(new OutputHandler());
$responseHandler->unknownServerError($info);
die();
}
register_shutdown_function("fatalErrorHandler");*/

require_once "configuration.php";

global $CONFIGURATION, $VERSION;
Logging::initialize($CONFIGURATION, $VERSION);

require_once "include/KloudspeakerBackend.class.php";
require_once "include/Settings.class.php";

$responseHandler = new ResponseHandler(new OutputHandler(getSetting($CONFIGURATION, 'mime_types', array()), isSetting($CONFIGURATION, 'support_output_buffer')));
try {
	$settings = new Settings($CONFIGURATION);
	$backend = new KloudspeakerBackend($settings, getDB($settings), $responseHandler);
	$backend->processRequest(Request::get());
} catch (ServiceException $e) {
	Logging::logException($e);
	$responseHandler->error($e->type(), $e->details(), $e->data());
} catch (Exception $e) {
	Logging::logException($e);
	$responseHandler->unknownServerError($e->getMessage());
}

function getDB($settings) {
	require_once "db/DBConnectionFactory.class.php";
	$f = new DBConnectionFactory();
	return $f->createConnection($settings);
}

function getSetting($settings, $name, $def) {
	if (!isset($settings) or !isset($settings[$name])) {
		return $def;
	}

	return $settings[$name];
}

function isSetting($settings, $name) {
	return isset($settings) and isset($settings[$name]) and $settings[$name] == TRUE;
}
?>