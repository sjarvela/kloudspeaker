<?php

/**
 * ConfigurationDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

// TODO split this class into separate UserDao, FolderDao etc

class ConfigurationDao {
	protected $db;
	protected $env;

	public function __construct($db) {
		$this->db = $db;
	}

	function initialize($env) {
		$this->env = $env;
	}

	public function internalTimestampFormat() {
		return "YmdHis";
	}

	public function formatTimestampInternal($ts) {
		return date($this->internalTimestampFormat(), $ts);
	}

	public function createTimestampFromInternal($val) {
		$str = "" . $val;
		$str = sprintf("%s-%s-%s %s:%s:%s", substr($val, 0, 4), substr($val, 4, 2), substr($val, 6, 2), substr($val, 8, 2), substr($val, 10, 2), substr($val, 12, 2));
		$ts = strtotime($str);
		//Logging::logDebug("ts ".$val." => ".date("Y-m-d H:i:s", $ts));
		return $ts;
	}

	public function getInstalledVersion() {
		return $this->db->query("SELECT value FROM " . $this->db->table("parameter") . " WHERE name='version'")->value();
	}

	public function findUser($username, $allowEmail = FALSE, $expiration = FALSE) {
		$expirationCriteria = $expiration ? " AND (expiration is null or expiration > " . $this->formatTimestampInternal($expiration) . ")" : "";

		if ($allowEmail) {
			$result = $this->db->query(sprintf("SELECT id, name, lower(user_type) as user_type, lower(lang) as lang, email, lower(ua.type) as auth FROM " . $this->db->table("user") . " left outer join " . $this->db->table("user_auth") . " ua on id=ua.user_id WHERE (name=%s or email=%s) and is_group=0" . $expirationCriteria, $this->db->string($username, TRUE), $this->db->string($username, TRUE)));
		} else {
			$result = $this->db->query(sprintf("SELECT id, name, lower(user_type) as user_type, lower(lang) as lang, email, lower(ua.type) as auth FROM " . $this->db->table("user") . " left outer join " . $this->db->table("user_auth") . " ua on id=ua.user_id WHERE name=%s and is_group=0" . $expirationCriteria, $this->db->string($username, TRUE)));
		}
		$matches = $result->count();

		if ($matches === 0) {
			Logging::logError("No user found with name [" . $username . "]");
			return NULL;
		}

		if ($matches > 1) {
			Logging::logError("Duplicate user found with name [" . $username . "] and password");
			return FALSE;
		}

		return $result->firstRow();
	}

	public function getUserInfo($ids) {
		return $this->db->query(sprintf("SELECT id, name FROM " . $this->db->table("user") . " WHERE id in (" . $this->db->arrayString($ids, TRUE) . ")"))->rows();
	}

	public function getUserAuth($id) {
		return $this->db->query(sprintf("SELECT user_id, lower(type) as type, hash, salt, hint FROM " . $this->db->table("user_auth") . " WHERE user_id=%s", $this->db->string($id, TRUE)))->firstRow();
	}

	public function storeUserAuth($id, $username, $type, $pw, $hint = "") {
		$transaction = $this->db->isTransaction();
		if (!$transaction) {
			$this->db->startTransaction();
		}

		$this->db->update(sprintf("DELETE FROM " . $this->db->table("user_auth") . " WHERE user_id=%s", $this->db->string($id, TRUE)));

		$hash = $this->env->passwordHash()->createHash($pw);
		$a1hash = md5($username . ":" . $this->env->authentication()->realm() . ":" . $pw);

		$this->db->update(sprintf("INSERT INTO " . $this->db->table("user_auth") . " (user_id, type, hash, salt, a1hash, hint) VALUES (%s, %s, %s, %s, %s, %s)", $this->db->string($id, TRUE), $this->db->string($type, TRUE), $this->db->string($hash["hash"], TRUE), $this->db->string($hash["salt"], TRUE), $this->db->string($a1hash, TRUE), $this->db->string($hint, TRUE)));
		if (!$transaction) {
			$this->db->commit();
		}
	}

	public function updateUserAuth($id, $username, $pw, $hint, $type = FALSE) {
		$hash = $this->env->passwordHash()->createHash($pw);
		$a1hash = md5($username . ":" . $this->env->authentication()->realm() . ":" . $pw);
		if ($type !== FALSE) {
			$this->db->update(sprintf("UPDATE " . $this->db->table("user_auth") . " SET hash=%s, salt=%s, a1hash=%s, hint=%s, type=%s WHERE user_id=%s", $this->db->string($hash["hash"], TRUE), $this->db->string($hash["salt"], TRUE), $this->db->string($a1hash, TRUE), $this->db->string($hint, TRUE), $this->db->string($type, TRUE), $this->db->string($id, TRUE)));
		} else {
			$this->db->update(sprintf("UPDATE " . $this->db->table("user_auth") . " SET hash=%s, salt=%s, a1hash=%s, hint=%s WHERE user_id=%s", $this->db->string($hash["hash"], TRUE), $this->db->string($hash["salt"], TRUE), $this->db->string($a1hash, TRUE), $this->db->string($hint, TRUE), $this->db->string($id, TRUE)));
		}
	}

	public function updateUserAuthType($id, $type) {
		$this->db->update(sprintf("UPDATE " . $this->db->table("user_auth") . " SET type=%s WHERE user_id=%s", $this->db->string($type, TRUE), $this->db->string($id, TRUE)));
	}

	public function getUserByName($username, $expiration = FALSE) {
		$expirationCriteria = $expiration ? " AND (expiration is null or expiration > " . $this->formatTimestampInternal($expiration) . ")" : "";

		$result = $this->db->query(sprintf("SELECT id, name, lower(user_type) as user_type, lower(lang) as lang, email, lower(ua.type) as auth FROM " . $this->db->table("user") . " left outer join " . $this->db->table("user_auth") . " ua on id=ua.user_id WHERE name='%s' and is_group=0" . $expirationCriteria, $this->db->string($username)));
		$matches = $result->count();

		if ($matches === 0) {
			Logging::logError("No user found with name [" . $username . "]");
			return NULL;
		}

		if ($matches > 1) {
			Logging::logError("Duplicate user found with name [" . $username . "]");
			return FALSE;
		}

		return $result->firstRow();
	}

	public function getUserByNameOrEmail($name) {
		$result = $this->db->query(sprintf("SELECT id, name, lower(user_type) as user_type, lower(lang) as lang, email, lower(ua.type) as auth FROM " . $this->db->table("user") . " left outer join " . $this->db->table("user_auth") . " ua on id=ua.user_id WHERE (name='%s' or email='%s') and is_group=0", $this->db->string($name), $this->db->string($name)));
		$matches = $result->count();

		if ($matches === 0) {
			Logging::logError("No user found with name or email[" . $name . "]");
			return NULL;
		}

		if ($matches > 1) {
			Logging::logError("Duplicate user found with name or email [" . $name . "]");
			return FALSE;
		}

		return $result->firstRow();
	}

	public function getUsersByEmail($email) {
		$result = $this->db->query(sprintf("SELECT id, name, lower(user_type) as user_type, lower(lang) as lang, email, lower(ua.type) as auth FROM " . $this->db->table("user") . " left outer join " . $this->db->table("user_auth") . " ua on id=ua.user_id WHERE (email='%s') and is_group=0", $this->db->string($email)));
		return $result->rows();
	}

	public function getAllUsers($groups = FALSE, $usersGroups = FALSE) {
		if ($usersGroups) {
			$rows = $this->db->query("SELECT u.id as id, u.name as name, lower(u.lang) as lang, u.email as email, lower(u.user_type) as user_type, u.expiration as expiration, u.is_group as is_group, ug.group_id as group_id FROM " . $this->db->table("user") . " u LEFT OUTER JOIN " . $this->db->table("user_group") . " ug on ug.user_id = u.id ORDER BY id ASC")->rows();
			$prev = NULL;
			$result = array();
			$last = NULL;
			foreach ($rows as $r) {
				if ($r["id"] != $prev) {
					if ($last != NULL) {
						$result[] = $last;
					}

					$last = $r;
					$last["group_ids"] = array();
				}
				if ($r["group_id"] != NULL) {
					$last["group_ids"][] = $r["group_id"];
				}

				$prev = $r["id"];
				unset($r["group_id"]);
			}
			if ($last != NULL) {
				$result[] = $last;
			}

			return $result;
		}
		return $this->db->query("SELECT id, name, lower(lang) as lang, email, lower(user_type) as user_type, expiration, is_group FROM " . $this->db->table("user") . " where " . ($groups ? "1=1" : "is_group = 0") . " ORDER BY id ASC")->rows();
	}

	public function getUser($id, $expiration = FALSE) {
		$expirationCriteria = $expiration ? " AND (expiration is null or expiration > " . $this->formatTimestampInternal($expiration) . ")" : "";

		return $this->db->query(sprintf("SELECT id, name, lower(user_type) as user_type, lower(lang) as lang, email, expiration, lower(ua.type) as auth FROM " . $this->db->table("user") . " left outer join " . $this->db->table("user_auth") . " ua on id=ua.user_id WHERE id='%s'" . $expirationCriteria, $this->db->string($id)))->firstRow();
	}

	public function userQuery($rows, $start, $criteria, $sort = NULL) {
		$strFields = array("name", "email");
		$likeFields = array("name", "email");

		$db = $this->env->db();
		$query = "from " . $db->table("user") . " left outer join " . $db->table("user_auth") . " ua on id=ua.user_id where 1=1";

		foreach ($criteria as $k => $v) {
			if (!in_array($k, $strFields)) {
				$query .= " and " . $k . "=" . $this->db->string($v);
			} else {
				if (!in_array($k, $likeFields)) {
					$query .= " and " . $k . "=" . $this->db->string($v, TRUE);
				} else {
					$query .= " and " . $k . " like " . $this->db->string($v, TRUE);
				}
			}
		}

		$query .= ' order by ';
		if ($sort != NULL) {

			$query .= $sort["id"] . ' ' . ($sort["asc"] == TRUE ? "asc" : "desc");
		} else {
			$query .= ' id asc';
		}

		$count = $db->query("select count(id) " . $query)->value(0);
		$result = $db->query("select id, name, lower(user_type) as user_type, lower(lang) as lang, email, expiration, is_group, lower(ua.type) as auth " . $query . " limit " . $rows . " offset " . $start)->rows();

		return array("start" => $start, "count" => count($result), "total" => $count, "data" => $result);
	}

	public function addUser($name, $lang, $email, $type, $expiration) {
		if (isset($email) and strlen($email) > 0) {
			$matches = $this->db->query(sprintf("SELECT count(id) FROM " . $this->db->table("user") . " WHERE (name='%s' or email='%s') and is_group=0", $this->db->string($name), $this->db->string($email)))->value();
		} else {
			$matches = $this->db->query(sprintf("SELECT count(id) FROM " . $this->db->table("user") . " WHERE name='%s' and is_group=0", $this->db->string($name)))->value();
		}

		if ($matches > 0) {
			throw new ServiceException("INVALID_REQUEST", "Duplicate user found with name [" . $name . "] or email [" . $email . "]");
		}

		$this->db->update(sprintf("INSERT INTO " . $this->db->table("user") . " (name, lang, email, user_type, is_group, expiration) VALUES (%s, %s, %s, %s, 0, %s)", $this->db->string($name, TRUE), $this->db->string($lang, TRUE), $this->db->string($email, TRUE), $this->db->string($type, TRUE), $this->db->string($expiration)));
		return $this->db->lastId();
	}

	public function updateUser($id, $name, $lang, $email, $type, $expiration, $description = NULL) {
		$affected = $this->db->update(sprintf("UPDATE " . $this->db->table("user") . " SET name=%s, lang=%s, email=%s, user_type=%s, expiration=%s, description=%s WHERE id=%s", $this->db->string($name, TRUE), $this->db->string($lang, TRUE), $this->db->string($email, TRUE), $this->db->string($type, TRUE), $this->db->string($expiration), $this->db->string($description != NULL ? $description : "", TRUE), $this->db->string($id, TRUE)));
		return TRUE;
	}

	public function removeUser($userId) {
		$transaction = $this->db->isTransaction();
		$id = $this->db->string($userId);

		if (!$transaction) {
			$this->db->startTransaction();
		}

		$this->db->update(sprintf("DELETE FROM " . $this->db->table("user_folder") . " WHERE user_id='%s'", $id));
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("user_group") . " WHERE user_id='%s'", $id));
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("permission") . " WHERE user_id='%s'", $id));
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("user_auth") . " WHERE user_id='%s'", $id));
		$affected = $this->db->update(sprintf("DELETE FROM " . $this->db->table("user") . " WHERE id='%s'", $id));
		if ($affected === 0) {
			throw new ServiceException("INVALID_REQUEST", "Invalid delete user request, user " . $id . " not found");
		}

		if (!$transaction) {
			$this->db->commit();
		}

		return TRUE;
	}

	public function removeUsers($ids) {
		$this->db->startTransaction();
		foreach ($ids as $id) {
			$this->removeUser($id);
		}

		$this->db->commit();
		return TRUE;
	}

	public function getAllUserGroups() {
		return $this->db->query("SELECT id, name, description, is_group FROM " . $this->db->table("user") . " where is_group = 1 ORDER BY id ASC")->rows();
	}

	public function getUserGroup($id) {
		return $this->getUser($id);
	}

	public function getUsersGroups($userId) {
		return $this->db->query("select id, name, description from " . $this->db->table("user") . " where id in (SELECT user_group.group_id FROM " . $this->db->table("user") . " as user, " . $this->db->table("user_group") . " as user_group where user_group.user_id = user.id and user.id = '" . $this->db->string($userId) . "') ORDER BY id ASC")->rows();
	}

	public function addUsersGroups($userId, $groupIds) {
		$this->db->startTransaction();
		foreach ($groupIds as $id) {
			$this->db->update("INSERT INTO " . $this->db->table("user_group") . " (group_id, user_id) VALUES (" . $this->db->string($id) . "," . $this->db->string($userId) . ")");
		}
		$this->db->commit();
		return TRUE;
	}

	public function removeUsersGroups($userId, $groupIds) {
		$this->db->update("DELETE FROM " . $this->db->table("user_group") . " where group_id in (" . $this->db->arrayString($groupIds) . ") and user_id=" . $this->db->string($userId, TRUE));
		return TRUE;
	}

	public function getGroupUsers($id) {
		return $this->db->query("SELECT user.id as id, user.name as name, user.lang as lang, user.user_type, user.email as email FROM " . $this->db->table("user") . " as user, " . $this->db->table("user_group") . " as user_group where user_group.user_id = user.id and user_group.group_id = '" . $this->db->string($id) . "' ORDER BY user.id ASC")->rows();
	}

	public function addGroupUsers($groupId, $userIds) {
		$this->db->startTransaction();
		foreach ($userIds as $id) {
			$this->db->update("INSERT INTO " . $this->db->table("user_group") . " (group_id, user_id) VALUES (" . $this->db->string($groupId) . "," . $this->db->string($id) . ")");
		}
		$this->db->commit();
		return TRUE;
	}

	public function removeGroupUsers($groupId, $userIds = NULL) {
		if ($userIds == NULL) {
			$this->db->update("DELETE FROM " . $this->db->table("user_group") . "  WHERE group_id = '" . $this->db->string($groupId) . "'");
		} else {
			$this->db->update("DELETE FROM " . $this->db->table("user_group") . " WHERE group_id = '" . $this->db->string($groupId) . "' and user_id in (" . $this->db->arrayString($userIds) . ")");
		}

		return TRUE;
	}

	public function addUserGroup($name, $description) {
		$matches = $this->db->query(sprintf("SELECT count(id) FROM " . $this->db->table("user") . " WHERE name=%s and is_group=1", $this->db->string($name, TRUE)))->value();
		if ($matches > 0) {
			throw new ServiceException("INVALID_REQUEST", "Duplicate group found with name [" . $name . "]");
		}

		$this->db->update(sprintf("INSERT INTO " . $this->db->table("user") . " (name, description, user_type, is_group) VALUES (%s, %s, NULL, 1)", $this->db->string($name, TRUE), $this->db->string($description, TRUE)));
		return $this->db->lastId();
	}

	public function updateUserGroup($id, $name, $description) {
		return $this->updateUser($id, $name, NULL, NULL, NULL, NULL, $description);
	}

	public function removeUserGroups($ids) {
		$this->db->startTransaction();
		foreach ($ids as $id) {
			$this->removeUserGroup($id);
		}

		$this->db->commit();
		return TRUE;
	}

	public function removeUserGroup($id) {
		$this->db->startTransaction();
		$this->removeGroupUsers($id);
		$this->removeUser($id);
		$this->db->commit();
		return TRUE;
	}

	public function getFolders() {
		return $this->db->query("SELECT id, type, name, path FROM " . $this->db->table("folder") . " ORDER BY id ASC")->rows();
	}

	public function getFolder($id) {
		return $this->db->query(sprintf("SELECT id, type, name, path FROM " . $this->db->table("folder") . " where id='%s'", $this->db->string($id)))->firstRow();
	}

	public function getFolderUsers($id) {
		return $this->db->query("SELECT user.id as id, user.name as name, user.user_type as user_type, user.is_group as is_group FROM " . $this->db->table("user") . " as user, " . $this->db->table("user_folder") . " as user_folder where user_folder.user_id = user.id and user_folder.folder_id = '" . $this->db->string($id) . "' ORDER BY user.id ASC")->rows();
	}

	public function addFolderUsers($folderId, $userIds) {
		$this->db->startTransaction();
		foreach ($userIds as $id) {
			$this->db->update("INSERT INTO " . $this->db->table("user_folder") . " (folder_id, user_id) VALUES (" . $this->db->string($folderId) . "," . $this->db->string($id) . ")");
		}
		$this->db->commit();
		return TRUE;
	}

	public function removeFolderUsers($folderId, $userIds) {
		$this->db->update("DELETE FROM " . $this->db->table("user_folder") . " WHERE folder_id = '" . $this->db->string($folderId) . "' and user_id in (" . $this->db->arrayString($userIds) . ")");
		return TRUE;
	}

	public function addFolder($name, $path, $type = 'local') {
		$this->db->update(sprintf("INSERT INTO " . $this->db->table("folder") . " (type, name, path) VALUES (%s, %s, %s)", $this->db->string($type, TRUE), $this->db->string($name, TRUE), $this->db->string($path, TRUE)));
		return $this->db->lastId();
	}

	public function updateFolder($id, $name, $path) {
		$this->db->update(sprintf("UPDATE " . $this->db->table("folder") . " SET name='%s', path='%s' WHERE id='%s'", $this->db->string($name), $this->db->string($path), $this->db->string($id)));
		return TRUE;
	}

	public function removeFolder($id) {
		$rootItem = $this->env->filesystem()->filesystemFromId($id, FALSE)->root();
		$rootLocation = str_replace("'", "\'", $rootItem->location());
		$rootId = $this->itemId($rootItem);
		$folderId = $this->db->string($id);

		$this->db->startTransaction();
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("user_folder") . " WHERE folder_id='%s'", $folderId));
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("permission") . " WHERE subject in (select id from " . $this->db->table("item_id") . " where path like '%s%%')", $rootLocation));
		$affected = $this->db->update(sprintf("DELETE FROM " . $this->db->table("folder") . " WHERE id='%s'", $folderId));
		if ($affected === 0) {
			throw new ServiceException("INVALID_REQUEST", "Invalid delete folder request, folder " . $rootId . " not found");
		}

		$this->db->commit();
		return TRUE;
	}

	public function getUserFolders($userId, $includeGroupFolders = FALSE) {
		$folderTable = $this->db->table("folder");
		$userFolderTable = $this->db->table("user_folder");
		$userTable = $this->db->table("user");

		$userIds = array($userId);
		if ($includeGroupFolders and $this->env->session()->hasUserGroups()) {
			foreach ($this->env->session()->userGroups() as $g) {
				$userIds[] = $g['id'];
			}
		}

		$userQuery = sprintf("(uf.user_id in (%s))", $this->db->arrayString($userIds));

		$l = $this->db->query(sprintf("SELECT f.id as id, f.type as type, uf.name as name, f.name as default_name, f.path as path FROM " . $userFolderTable . " uf, " . $folderTable . " f, " . $userTable . " u WHERE %s AND f.id = uf.folder_id AND u.id = uf.user_id ORDER BY u.is_group asc", $userQuery))->rows();
		return $l;
	}

	public function addUserFolders($userId, $folderIds) {
		foreach ($folderIds as $id) {
			$this->addUserFolder($userId, $id, NULL);
		}
	}

	public function addUserFolder($userId, $folderId, $name) {
		if ($name != NULL) {
			$this->db->update(sprintf("INSERT INTO " . $this->db->table("user_folder") . " (user_id, folder_id, name) VALUES ('%s', '%s', '%s')", $this->db->string($userId), $this->db->string($folderId), $this->db->string($name)));
		} else {
			$this->db->update(sprintf("INSERT INTO " . $this->db->table("user_folder") . " (user_id, folder_id, name) VALUES ('%s', '%s', NULL)", $this->db->string($userId), $this->db->string($folderId)));
		}

		return TRUE;
	}

	public function updateUserFolder($userId, $folderId, $name) {
		if ($name != NULL) {
			$this->db->update(sprintf("UPDATE " . $this->db->table("user_folder") . " SET name='%s' WHERE user_id='%s' AND folder_id='%s'", $this->db->string($name), $this->db->string($userId), $this->db->string($folderId)));
		} else {
			$this->db->update(sprintf("UPDATE " . $this->db->table("user_folder") . " SET name = NULL WHERE user_id='%s' AND folder_id='%s'", $this->db->string($userId), $this->db->string($folderId)));
		}

		return TRUE;
	}

	public function removeUserFolder($userId, $folderId) {
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("user_folder") . " WHERE folder_id='%s' AND user_id='%s'", $this->db->string($folderId), $this->db->string($userId)));
		return TRUE;
	}

	public function cleanupItemIds($ids) {
	}

	private function itemId($item) {
		return $this->db->string($item->id());
	}

	function log() {}

	public function __toString() {
		return "ConfigurationDao";
	}
}
?>
