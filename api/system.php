<?php
$KLOUDSPEAKER_ROOT = realpath(dirname(__FILE__)."/../");
$KLOUDSPEAKER_SYSTEM_INFO = [
	"root" => $KLOUDSPEAKER_ROOT
];

if (file_exists($KLOUDSPEAKER_ROOT."/configuration.php"))
	include $KLOUDSPEAKER_ROOT."/configuration.php";
global $CONFIGURATION;
if (file_exists($KLOUDSPEAKER_ROOT."/api/version.info.php"))
	include $KLOUDSPEAKER_ROOT."/api/version.info.php";
global $VERSION, $REVISION;

if (!isset($CONFIGURATION) or $CONFIGURATION == NULL) {	
	$KLOUDSPEAKER_SYSTEM_INFO = array_merge($KLOUDSPEAKER_SYSTEM_INFO, [
		"config_exists" => FALSE,
		"config" => NULL,
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

