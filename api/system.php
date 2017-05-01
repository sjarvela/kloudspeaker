<?php
$KloudspeakerRoot = realpath(dirname(__FILE__)."/../");
$KloudspeakerSystemInfo = [
	"root" => $KloudspeakerRoot
];

if (!file_exists($KloudspeakerRoot."/configuration.php")) {	
	$KloudspeakerSystemInfo = [
		"config_exists" => FALSE
	];
} else {
	include $KloudspeakerRoot."/configuration.php";
	include $KloudspeakerRoot."/api/Version.info.php";
	global $CONFIGURATION, $VERSION, $REVISION;

	if (!isset($CONFIGURATION)) {
		$KloudspeakerSystemInfo["config_exists"] = FALSE;
	} else {
		$KloudspeakerSystemInfo = array_merge($KloudspeakerSystemInfo, [
			"config_exists" => TRUE,
			"config" => $CONFIGURATION,
			"version" => $VERSION,
			"revision" => $REVISION
		]);
	}
}

function getKloudspeakerSystemInfo() {
	global $KloudspeakerSystemInfo;
	return $KloudspeakerSystemInfo;
}

