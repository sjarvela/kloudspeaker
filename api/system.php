<?php
$KLOUDSPEAKER_ROOT = realpath(dirname(__FILE__)."/../");
$KLOUDSPEAKER_SYSTEM_INFO = [
	"root" => $KLOUDSPEAKER_ROOT,
	"error" => NULL
];
$KLOUDSPEAKER_SYSTEM_ERROR = NULL;

try {
	if (file_exists($KLOUDSPEAKER_ROOT."/configuration.php"))
		include $KLOUDSPEAKER_ROOT."/configuration.php";
} catch (Exception $e) {
	$KLOUDSPEAKER_SYSTEM_ERROR = ["Error in configuration.php", $e];
} catch (Throwable $e) {
	$KLOUDSPEAKER_SYSTEM_ERROR = ["Error in configuration.php", $e];
}

if (file_exists($KLOUDSPEAKER_ROOT."/api/version.info.php"))
	include $KLOUDSPEAKER_ROOT."/api/version.info.php";

global $CONFIGURATION, $VERSION, $REVISION;

if ($KLOUDSPEAKER_SYSTEM_ERROR != NULL or !isset($CONFIGURATION) or $CONFIGURATION == NULL) {	
	$KLOUDSPEAKER_SYSTEM_INFO = array_merge($KLOUDSPEAKER_SYSTEM_INFO, [
		"config_exists" => FALSE,
		"config" => NULL,
		"error" => $KLOUDSPEAKER_SYSTEM_ERROR,
		"version" => $VERSION,
		"revision" => $REVISION
	]);
} else {
	$KLOUDSPEAKER_SYSTEM_INFO = array_merge($KLOUDSPEAKER_SYSTEM_INFO, [
		"config_exists" => TRUE,
		"config" => $CONFIGURATION,
		"version" => $VERSION,
		"revision" => $REVISION
	]);
}

function getKloudspeakerSystemInfo() {
	global $KLOUDSPEAKER_SYSTEM_INFO;
	return $KLOUDSPEAKER_SYSTEM_INFO;
}

