<?php

/**
 * index.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

$MAIN_PAGE = "install";
$installer = NULL;

set_include_path(realpath('../') . PATH_SEPARATOR . get_include_path());
require_once "KloudspeakerInstallProcessor.class.php";
require_once "install/DefaultInstaller.class.php";

chdir("..");
if (!file_exists("configuration.php")) {
	$installer = new DefaultInstaller("instructions_configuration_create");
} else {
	@include "configuration.php";
	global $CONFIGURATION;
	if (!isset($CONFIGURATION) or !isset($CONFIGURATION["db"]) or !isset($CONFIGURATION["db"]["type"]) or !isValidConfigurationType($CONFIGURATION["db"]["type"])) {
		$installer = new DefaultInstaller("instructions_configuration_type");
	}

}

if (!$installer) {
	$installer = createInstaller($CONFIGURATION, $CONFIGURATION["db"]["type"]);
}

try {
	$installer->process();
} catch (Exception $e) {
	$installer->onError($e);
}

function createInstaller($settings, $type) {
	switch (strtolower($type)) {
		case 'pdo':
			require_once "install/pdo/PDOInstaller.class.php";
			return new PDOInstaller($settings);
		case 'mysql':
			require_once "install/mysql/MySQLInstaller.class.php";
			return new MySQLInstaller($settings);
		case 'sqlite3':
		case 'sqlite':
			require_once "install/sqlite/SQLiteInstaller.class.php";
			return new SQLiteInstaller($settings);
		default:
			die("Invalid configuration type");
	}
}

function isValidConfigurationType($type) {
	return in_array(strtolower($type), array("pdo", "mysql", "sqlite", "sqlite3"));
}
?>