<?php

/**
 * SessionDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class SessionDao {
	private $env;

	public function __construct($env) {
		$this->env = $env;
	}

	public function getSession($id, $lastValid = NULL) {
		$db = $this->env->db();
		return $db->query(sprintf("select id, user_id, ip, time, last_access from " . $db->table("session") . " where id = %s and last_access >= %s", $db->string($id, TRUE), $db->string($lastValid)))->firstRow();
	}

	public function getSessionData($id) {
		$db = $this->env->db();
		return $db->query(sprintf("select name, value from " . $db->table("session_data") . " where session_id = %s", $db->string($id, TRUE)))->valueMap("name", "value");
	}

	public function addSession($id, $userId, $ip, $time) {
		$db = $this->env->db();
		$timeStr = $db->string($time);
		$db->update(sprintf("INSERT INTO " . $db->table("session") . " (id, user_id, ip, time, last_access) VALUES (%s, %s, %s, %s, %s)", $db->string($id, TRUE), $db->string($userId), $db->string($ip, TRUE), $timeStr, $timeStr));
	}

	public function addSessionData($id, $data) {
		$db = $this->env->db();
		$idStr = $db->string($id, TRUE);

		foreach ($data as $k => $v) {
			$db->update(sprintf("INSERT INTO " . $db->table("session_data") . " (session_id, name, value) VALUES (%s, %s, %s)", $idStr, $db->string($k, TRUE), $db->string($v, TRUE)));
		}
	}

	public function addOrSetSessionData($id, $name, $value) {
		$db = $this->env->db();
		$idStr = $db->string($id, TRUE);

		$count = $db->update(sprintf("UPDATE " . $db->table("session_data") . " set value=%s where session_id=%s and name=%s", $db->string($value, TRUE), $idStr, $db->string($name, TRUE)));
		if ($count === 0) {
			$db->update(sprintf("INSERT INTO " . $db->table("session_data") . " (session_id, name, value) VALUES (%s, %s, %s)", $idStr, $db->string($name, TRUE), $db->string($value, TRUE)));
		}

	}

	public function removeSession($id) {
		$db = $this->env->db();
		$db->update(sprintf("DELETE FROM " . $db->table("session_data") . " where session_id = %s", $db->string($id, TRUE)));
		$db->update(sprintf("DELETE FROM " . $db->table("session") . " where id = %s", $db->string($id, TRUE)));
	}

	public function updateSessionTime($id, $time) {
		$db = $this->env->db();
		$db->update(sprintf("UPDATE " . $db->table("session") . " set last_access=%s where id=%s", $db->string($time), $db->string($id, TRUE)));
	}

	public function removeAllSessionBefore($time) {
		$db = $this->env->db();
		$ids = $db->query(sprintf("select id from " . $db->table("session") . " where last_access < %s", $db->string($time)))->values("id");
		if (count($ids) == 0) {
			return;
		}

		$idList = $db->arrayString($ids, TRUE);
		$db->update(sprintf("DELETE FROM " . $db->table("session_data") . " where session_id in (%s)", $idList));
		$db->update(sprintf("DELETE FROM " . $db->table("session") . " where id in (%s)", $idList));
	}

	public function __toString() {
		return "SessionDao";
	}
}
?>