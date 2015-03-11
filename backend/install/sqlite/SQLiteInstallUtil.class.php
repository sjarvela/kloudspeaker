<?php

/**
 * SQLiteInstallUtil.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class SQLiteInstallUtil {
	private $db;

	public function __construct($db) {
		$this->db = $db;
	}

	public function db() {
		return $this->db;
	}

	public function execCreateTables() {
		$this->db->execSqlFile("db/sqlite/sql/install/create_tables.sql");
	}

	public function execInsertParams() {
		$this->db->execSqlFile("db/sqlite/sql/install/params.sql");
	}

	public function updateVersionStep($from, $to) {
		$file = "db/sqlite/sql/update/" . $from . "-" . $to . ".sql";
		$this->db->execSqlFile($file);
	}

	public function execPluginCreateTables($id, $basePath = NULL) {
		$this->db->execSqlFile(($basePath != NULL ? $basePath : "") . "plugin/" . $id . "/sqlite/install.sql");
	}

	public function updatePluginVersionStep($id, $from, $to, $basePath = NULL) {
		$file = ($basePath != NULL ? $basePath : "") . "plugin/" . $id . "/sqlite/" . $from . "-" . $to . ".sql";
		$this->db->execSqlFile($file);
	}
}
?>