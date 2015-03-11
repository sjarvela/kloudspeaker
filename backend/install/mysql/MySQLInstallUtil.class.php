<?php

/**
 * MySQLInstallUtil.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class MySQLInstallUtil {
	private $db;

	public function __construct($db) {
		$this->db = $db;
	}

	public function db() {
		return $this->db;
	}

	public function checkPermissions() {
		mysqli_report(MYSQLI_REPORT_ERROR);
		$table = $this->db->table("kloudspeaker_install_test");

		// first cleanup, if test table was left
		try {
			$this->db->query('DROP TABLE ' . $table, FALSE);
		} catch (ServiceException $e) {
			// ignore
		}

		$this->db->startTransaction();
		try {
			$tests = array("create table" => 'CREATE TABLE ' . $table . ' (id int NULL)',
				"insert data" => 'INSERT INTO ' . $table . ' (id) VALUES (1)',
				"update data" => 'UPDATE ' . $table . ' SET id = 2',
				"delete data" => 'DELETE FROM ' . $table,
				"drop table" => 'DROP TABLE ' . $table);

			foreach ($tests as $name => $query) {
				$phase = $name;
				$this->db->query($query, FALSE);
			}
		} catch (ServiceException $e) {
			throw new ServiceException("INVALID_CONFIGURATION", "Permission test failed, could not " . $phase . " (" . $e->details() . ")");
		}
		$this->db->commit();
	}

	public function execCreateTables() {
		$this->db->execSqlFile("db/mysql/sql/install/create_tables.sql");
	}

	public function execInsertParams() {
		$this->db->execSqlFile("db/mysql/sql/install/params.sql");
	}

	public function updateVersionStep($from, $to) {
		$file = "db/mysql/sql/update/" . $from . "-" . $to . ".sql";
		$this->db->execSqlFile($file);
	}

	public function execPluginCreateTables($id, $basePath = NULL) {
		$this->db->execSqlFile(($basePath != NULL ? $basePath : "") . "plugin/" . $id . "/mysql/install.sql");
	}

	public function updatePluginVersionStep($id, $from, $to, $basePath = NULL) {
		$file = ($basePath != NULL ? $basePath : "") . "plugin/" . $id . "/mysql/" . $from . "-" . $to . ".sql";
		$this->db->execSqlFile($file);
	}
}
?>