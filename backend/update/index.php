<?php

	/**
	 * index.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	$MAIN_PAGE = "update";
	$installer = NULL;
	
	set_include_path(realpath('../').PATH_SEPARATOR.get_include_path());
	chdir("..");

	if (!file_exists("configuration.php")) die();
	require("configuration.php");
	global $CONFIGURATION;

	try {
		$installer = createUpdater($CONFIGURATION);
	} catch (Exception $e) {
		showError($e);
		die();
	} 
	try {
		$installer->process();
	} catch (Exception $e) {
		$installer->onError($e);
		showError($e);
	}
		
	function createUpdater($settings) {
		if (!isset($settings) or !isset($settings["db"]) or !isset($settings["db"]["type"]) or !isValidConfigurationType($settings["db"]["type"])) die();
		
		require_once("update/UpdateController.class.php");
		switch (strtolower($settings["db"]["type"])) {
			case 'pdo':
				require_once("update/pdo/PDOUpdater.class.php");
				return new UpdateController(new PDOUpdater($settings));
			case 'mysql':
				require_once("update/mysql/MySQLUpdater.class.php");
				return new UpdateController(new MySQLUpdater($settings));
			case 'sqlite':
			case 'sqlite3':
				require_once("update/sqlite/SQLiteUpdater.class.php");
				return new UpdateController(new SQLiteUpdater($settings));
			default:
				die("Unsupported updater type: ".$type);
		}
	}
	
	function isValidConfigurationType($type) {
		return in_array(strtolower($type), array("pdo", "mysql", "sqlite", "sqlite3"));
	}
	
	function showError($e) {
		$c = get_class($e);
		if ($c === "ServiceException") {
			echo "Kloudspeaker error (".$e->type()."): ".$e->details();
		} else {
			echo "Unknown error (".$c."): ".$e->getMessage();
		}
	}
?>