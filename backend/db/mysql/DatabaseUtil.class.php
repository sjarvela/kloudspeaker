<?php

/**
 * DatabaseUtil.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
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
		return array("0_9_5", "1_0_0", "1_5_0", "1_5_4", "1_6_0", "1_7_8", "1_7_10", "1_8_1", "1_8_5", "1_8_7", "1_8_8", "2_0", "2_2", "2_4", "2_5", "2_5_1", "2_5_6", "2_6");
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