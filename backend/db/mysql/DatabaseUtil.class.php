<?php

/**
 * DatabaseUtil.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class DatabaseUtil {
	private $db;

	public function __construct($db) {
		$this->db = $db;
	}

	public function db() {
		return $this->db;
	}

	public function getVersionHistory() {
		return array("2_6_7");
	}

	public function currentVersion() {
		$list = $this->getVersionHistory();
		return $list[count($list) - 1];
	}

	public function installedVersion() {
		$result = $this->db->query("SELECT value FROM " . $this->db->table("parameter") . " WHERE name='version'");
		if ($result->count() === 0) {
			return NULL;
		}

		$ver = trim($result->firstValue("value"));
		return ($ver === "" ? NULL : $ver);
	}

	public function pluginInstalledVersion($id) {
		$result = $this->db->query("SELECT value FROM " . $this->db->table("parameter") . " WHERE name='plugin_" . $id . "_version'");
		if ($result->count() === 0) {
			return NULL;
		}

		$ver = trim($result->firstValue("value"));
		return ($ver === "" ? NULL : $ver);
	}

	public function createDatabase() {
		$this->db->query("CREATE DATABASE " . $this->db->database(), FALSE);
		$this->db->selectDb();
	}

}

?>