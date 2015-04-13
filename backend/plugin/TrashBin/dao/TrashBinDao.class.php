<?php

/**
 * TrashBinDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under Commercial Plugin License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class TrashBinDao {
	private $env;

	public function __construct($env) {
		$this->env = $env;
	}

	public function addItem($trashId, $itemId, $folderId, $itemPath, $userId, $created) {
		$db = $this->env->db();
		$db->startTransaction();
		$db->update(sprintf("INSERT INTO " . $db->table("trashbin") . " (id, item_id, folder_id, path, user_id, created) VALUES (%s, %s, %s, %s, %s, %s)", $db->string($trashId, TRUE), $db->string($itemId, TRUE), $db->string($folderId, TRUE), $db->string($path, TRUE), $db->string($userId, TRUE), $db->string($created)));
		$db->commit();
	}

	public function getUserItems($userId) {
		$db = $this->env->db();
		return $db->query("select id, item_id, folder_id, path, user_id, created from " . $db->table("trashbin") . " where user_id = " . $db->string($userId, TRUE) . " order by created asc")->rows();
	}

	public function __toString() {
		return "TrashBinDao";
	}
}
?>
