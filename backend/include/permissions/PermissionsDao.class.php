<?php
/**
 * PermissionsDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Kloudspeaker_PermissionsDao {
	private $env;
	private $db;

	public function __construct($env) {
		$this->env = $env;
		$this->db = $env->db();
	}

	public function getFilesystemPermission($name, $item, $userId, $groupIds = NULL) {
		$rows = $this->getEffectiveFilesystemPermissions($name, $item, $userId, $groupIds);
		if (count($rows) < 1) {
			return array();
		}

		//Logging::logDebug(Util::array2str($rows));

		$result = array();
		$prevName = NULL;
		foreach ($rows as $row) {
			if ($row["name"] != $prevName) {
				$prevName = $row["name"];
				$result[$prevName] = $row["value"];
			}
		}
		return $result;
	}

	public function getEffectiveFilesystemPermissions($name, $item, $userId, $groupIds) {
		$mysql = (strcmp("mysql", $this->db->type()) == 0);
		$table = $this->db->table("permission");
		$id = $item->id();

		$userIds = array(0);
		if ($userId != NULL) {
			$userIds[] = $userId;
		}

		if ($groupIds != NULL) {
			foreach ($groupIds as $g) {
				$userIds[] = $g;
			}
		}

		$userQuery = sprintf("(user_id in (%s))", $this->db->arrayString($userIds));

		// order within category into 1) user specific 2) group 3) item default
		if ($mysql) {
			$subcategoryQuery = sprintf("(IF(user_id = '%s', 1, IF(user_id = '0', 3, 2)))", $userId);
		} else {
			$subcategoryQuery = sprintf("(case when user_id = '%s' then 1 when user_id = '0' then 3 else 2 end)", $userId);
		}

		$nameQuery = is_array($name) ? "in (" . $this->db->arrayString($name, TRUE) . ")" : "=" . $this->db->string($name, TRUE);

		// item permissions
		$query = sprintf("SELECT value, name, user_id, subject, (case when subject = '' then 2 else 1 end) as cat1, %s as cat2, 0 as cat3 FROM " . $table . " WHERE name %s AND (subject = '' OR subject = '%s') AND %s", $subcategoryQuery, $nameQuery, $id, $userQuery);

		if ($item->isFile() or !$item->isRoot()) {
			$parentLocation = $this->env->filesystem()->itemIdProvider()->itemQueryPath($item->parent());
			$rootLocation = $this->env->filesystem()->itemIdProvider()->itemQueryPath($item->root());

			if ($mysql) {
				$hierarchyQuery = "(i.path REGEXP '^" . Util::escapePathRegex($rootLocation);
			} else {
				$hierarchyQuery = "REGEX(i.path, '#^" . Util::escapePathRegex($rootLocation);
			}

			$hierarchyQueryEnd = "";
			$parts = preg_split("/[\/]+/", substr($parentLocation, strlen($rootLocation)), -1, PREG_SPLIT_NO_EMPTY);
			//Logging::logDebug(Util::array2str($parts));
			foreach ($parts as $part) {
				$hierarchyQuery .= "(" . Util::escapePathRegex($part) . "/";
				$hierarchyQueryEnd .= ")*";
			}
			if ($mysql) {
				$hierarchyQuery .= $hierarchyQueryEnd . "$')";
			} else {
				$hierarchyQuery .= $hierarchyQueryEnd . "$#')";
			}

			$cat1 = "case when p.subject = '' then 3 when p.subject = '" . $id . "' then 1 else 2 end";

			if ($mysql) {
				$cat2 = sprintf("(0 - CHAR_LENGTH(i.path))");
				$cat3 = sprintf("(IF(user_id = '%s', 0, IF(user_id = '0', 2, 1)))", $userId);
			} else {
				$cat2 = sprintf("(0 - LENGTH(i.path))");
				$cat3 = sprintf("(case when user_id = '%s' then 0 when user_id = '0' then 2 else 1 end)", $userId);
			}
			$query = sprintf("SELECT p.name as name, value, user_id, p.subject as subject, i.path as path, %s AS cat1, %s AS cat2, %s AS cat3 FROM " . $table . " p LEFT OUTER JOIN " . $this->db->table("item_id") . " i on p.subject = i.id WHERE p.name %s AND (p.subject = '' OR (i.id = '%s' OR %s)) AND %s", $cat1, $cat2, $cat3, $nameQuery, $id, $hierarchyQuery, $userQuery);
			//Logging::logDebug(Util::array2str($this->db->query("select * from item_id i where ".$hierarchyQuery)->rows()));
		}

		$query = "SELECT name, value, user_id, subject FROM (" . $query . ") as u ORDER BY name ASC, u.cat1 ASC, u.cat2 ASC, u.cat3 ASC, u.value DESC";

		return $this->db->query($query)->rows();
	}

	public function getFilesystemPermissionsForChildren($name, $parent, $userId, $groupIds = NULL) {
		//$parentLocation = str_replace("'", "\'", str_replace("\\", "\\\\", $parent->location()));	//itemidprovider
		$table = $this->db->table("permission");
		$mysql = (strcmp("mysql", $this->db->type()) == 0);

		$userIds = array(0, $userId);
		if ($groupIds != NULL) {
			foreach ($groupIds as $g) {
				$userIds[] = $g;
			}
		}

		$userQuery = sprintf("(user_id in (%s))", $this->db->arrayString($userIds));

		$nameQuery = ($name != NULL) ? "name = " . $this->db->string($name, TRUE) : "";

		//TODO subject asc? -> join p.subject = item.id & item.location asc
		$pathFilter = $this->env->filesystem()->itemIdProvider()->pathQueryFilter($parent);
		if ($mysql) {
			$itemFilter = "SELECT distinct subject from " . $table . " p, " . $this->db->table("item_id") . " i where p.subject = i.id and " . $userQuery . " and ".$pathFilter;//i.path REGEXP '^" . $parentLocation . "[^/]+[/]?$'";
			$query = sprintf("SELECT subject, name, value, (IF(user_id = '%s', 1, IF(user_id = '0', 3, 2))) as ind from %s where %s and %s and subject in (%s) order by subject asc, ind asc, value desc", $userId, $table, $nameQuery, $userQuery, $itemFilter);
		} else {
			$itemFilter = "SELECT distinct subject from " . $table . " p, " . $this->db->table("item_id") . " i where p.subject = i.id and " . $userQuery . " and ".$pathFilter;//REGEX(i.path, \"#^" . $parentLocation . "[^/]+[/]?$#\")";
			$query = sprintf("SELECT subject, name, value, case when user_id = '%s' then 1 when user_id = '0' then 3 else 2 end as ind from %s where %s and %s and subject in (%s) order by name asc, subject asc, ind asc, value desc", $userId, $table, $nameQuery, $userQuery, $itemFilter);
		}

		$all = $this->db->query($query)->rows();

		$parentPermission = $this->getFilesystemPermission($name, $parent, $userId, $groupIds);
		if ($parentPermission != NULL and array_key_exists($name, $parentPermission)) {
			$all[] = array(
				"subject" => $parent->id(),
				"value" => $parentPermission[$name]
			);
		}

		//$result = array();
		$k = array();
		$prev = NULL;
		//$prevName = NULL;
		foreach ($all as $p) {
			/*if ($p["name"] != $prevName) {
			$prevName = $p["name"];
			$result[$p["name"]] = $k;
			}*/
			$id = $p["subject"];
			if ($id != $prev) {
				$k[$id] = $p["value"];
			}

			$prev = $id;
		}
		return $k;
	}

	public function getGenericPermissions($name = NULL, $userId) {
		$criteria = ($name != NULL ? "permission.name=" . $this->db->string($name, TRUE) : "1=1");
		$criteria .= " AND subject = ''";
		$criteria .= ($userId != NULL ? " AND user_id=" . $this->db->string($userId) : "");
		return $this->doGetPermissions($criteria);
	}

	public function getPermissions($name = NULL, $subject = NULL, $userId) {
		$criteria = ($name != NULL ? "permission.name=" . $this->db->string($name, TRUE) : "1=1");
		$criteria .= ($subject != NULL ? " AND subject=" . $this->db->string($subject, TRUE) : "");
		$criteria .= ($userId != NULL ? " AND user_id=" . $this->db->string($userId) : "");
		return $this->doGetPermissions($criteria);
	}

	private function doGetPermissions($criteria) {
		$rows = $this->db->query("SELECT user.id as user_id, user.is_group as is_group, permission.value as value, permission.name as name, permission.subject as subject FROM " . $this->db->table("permission") . " as permission LEFT OUTER JOIN " . $this->db->table("user") . " as user ON user.id = permission.user_id WHERE " . $criteria)->rows();

		$list = array();
		foreach ($rows as $row) {
			if (!isset($row["user_id"])) {
				$list[] = array("name" => $row["name"], "subject" => $row["subject"], "user_id" => '0', "is_group" => 0, "value" => $row["value"]);
			} else {
				$list[] = array("name" => $row["name"], "subject" => $row["subject"], "user_id" => $row["user_id"], "is_group" => $row["is_group"], "value" => $row["value"]);
			}
		}

		return $list;
	}

	public function getEffectiveGenericPermissions($name, $userId, $groupIds) {
		$mysql = (strcmp("mysql", $this->db->type()) == 0);
		$table = $this->db->table("permission");

		$userIds = array(0, $userId);
		if ($groupIds != NULL) {
			foreach ($groupIds as $g) {
				$userIds[] = $g;
			}
		}

		$userQuery = sprintf("(user_id in (%s))", $this->db->arrayString($userIds));

		// order within category into 1) user specific 2) group 3) default
		if ($mysql) {
			$subcategoryQuery = sprintf("(IF(user_id = '%s', 1, IF(user_id = '0', 3, 2)))", $userId);
		} else {
			$subcategoryQuery = sprintf("(case when user_id = '%s' then 1 when user_id = '0' then 3 else 2 end)", $userId);
		}

		$nameQuery = is_array($name) ? "in (" . $this->db->arrayString($name, TRUE) . ")" : "=" . $this->db->string($name, TRUE);

		// item permissions
		$query = sprintf("SELECT value, name, user_id, subject, %s as cat FROM " . $table . " WHERE name %s AND subject = '' AND %s", $subcategoryQuery, $nameQuery, $userQuery);

		$query = "SELECT name, value, user_id, subject FROM (" . $query . ") as u ORDER BY name ASC, u.cat ASC, u.value DESC";

		$all = $this->db->query($query)->rows();

		$k = array();
		$prev = NULL;
		foreach ($all as $p) {
			$name = $p["name"];
			if ($name != $prev) {
				$k[$name] = $p["value"];
			}

			$prev = $name;
		}
		return $k;
	}

	public function updatePermissions($updates) {
		$new = isset($updates['new']) ? $updates['new'] : array();
		$modified = isset($updates['modified']) ? $updates['modified'] : array();
		$removed = isset($updates['removed']) ? $updates['removed'] : array();

		$this->db->startTransaction();
		if (count($new) > 0) {
			$this->addPermissionValues($new);
		}

		if (count($modified) > 0) {
			$this->updatePermissionValues($modified);
		}

		if (count($removed) > 0) {
			$this->removePermissionValues($removed);
		}

		$this->db->commit();

		return TRUE;
	}

	private function addPermissionValues($list) {
		$query = "INSERT INTO " . $this->db->table("permission") . " (name, subject, user_id, value) VALUES ";
		$first = TRUE;

		foreach ($list as $item) {
			$name = $this->db->string(strtolower($item["name"]), TRUE);
			$value = $this->db->string(strtolower($item["value"]), TRUE);
			$subject = isset($item["subject"]) ? $this->db->string($item["subject"], TRUE) : "NULL";
			$user = "'0'";
			if ($item["user_id"] != NULL) {
				$user = $this->db->string($item["user_id"], TRUE);
			}

			if (!$first) {
				$query .= ',';
			}

			$query .= sprintf(" (%s, %s, %s, %s)", $name, $subject, $user, $value);
			$first = FALSE;
		}

		$this->db->update($query);

		return TRUE;
	}

	private function updatePermissionValues($list) {
		foreach ($list as $item) {
			$name = $this->db->string($item["name"], TRUE);
			$value = $this->db->string(strtolower($item["value"]), TRUE);
			$subject = $item["subject"] != NULL ? '=' . $this->db->string($item["subject"], TRUE) : "= ''";
			$user = '0';
			if ($item["user_id"] != NULL) {
				$user = $this->db->string($item["user_id"]);
			}

			$this->db->update(sprintf("UPDATE " . $this->db->table("permission") . " SET value=%s WHERE name=%s AND subject %s AND user_id=%s", $value, $name, $subject, $user));
		}

		return TRUE;
	}

	private function removePermissionValues($list) {
		foreach ($list as $item) {
			$name = $this->db->string($item["name"], TRUE);
			$subject = $item["subject"] != NULL ? '=' . $this->db->string($item["subject"], TRUE) : "= ''";
			$user = "0";
			if ($item["user_id"] != NULL) {
				$user = $this->db->string($item["user_id"]);
			}

			$this->db->update(sprintf("DELETE FROM " . $this->db->table("permission") . " WHERE name = %s AND subject %s AND user_id = %s", $name, $subject, $user));
		}

		return TRUE;
	}

	public function removeFilesystemPermissions($name, $item) {
		$nameCriteria = ($name != NULL ? "name=" . $this->db->string($name, TRUE) . " AND " : "");

		if (!$item->isFile()) {
			$this->db->update(sprintf("DELETE FROM " . $this->db->table("permission") . " WHERE " . $nameCriteria . "subject in (select id from " . $this->db->table("item_id") . " where path like '%s%%')", str_replace("'", "\'", $item->location())));
		} else {
			$this->db->update(sprintf("DELETE FROM " . $this->db->table("permission") . " WHERE " . $nameCriteria . "subject=%s", $this->db->string($item->id(), TRUE)));
		}
		return TRUE;
	}

	public function addPermission($name, $subject, $userId, $value = "1") {
		$query = sprintf("INSERT INTO " . $this->db->table("permission") . " (name, subject, user_id, value) VALUES (%s, %s, %s, %s)", $this->db->string($name, TRUE), $this->db->string($subject, TRUE), $this->db->string($userId, TRUE), $this->db->string(strtolower($value), TRUE));
		$this->db->update($query);

		return TRUE;
	}

	public function processQuery($data) {
		$criteria = ((isset($data["name"]) and $data["name"] != NULL) ? "permission.name=" . $this->db->string($data["name"], TRUE) : "1=1");

		if (isset($data["subject_type"]) and $data["subject_type"] != NULL and $data["subject_type"] != 'any') {
			if ($data["subject_type"] == "none") {
				$criteria .= " AND subject = ''";
			}

			if (($data["subject_type"] == "filesystem_item" or $data["subject_type"] == "filesystem_child") and isset($data["subject_value"]) and $data["subject_value"] != NULL) {
				if ($data["subject_type"] == "filesystem_item") {
					$criteria .= " AND subject = " . $this->db->string($data["subject_value"], TRUE);
				} else {
					$item = $this->env->filesystem()->item($data["subject_value"]);
					$location = str_replace("'", "\'", $item->location());
					$criteria .= sprintf(" AND subject in (select id from " . $this->db->table("item_id") . " where path like '%s%%')", $location);
				}
			}
		}

		$criteria .= ((isset($data["user_id"]) and $data["user_id"] != NULL) ? " AND user_id=" . $this->db->string($data["user_id"]) : "");

		$count = $this->db->query("select count(name) FROM " . $this->db->table("permission") . " as permission WHERE " . $criteria)->value(0);
		$rows = isset($data["count"]) ? $data["count"] : 50;
		$start = isset($data["start"]) ? $data["start"] : 0;

		$rows = $this->db->query("SELECT user.id as user_id, user.is_group as is_group, permission.value as value, permission.name as name, permission.subject as subject FROM " . $this->db->table("permission") . " as permission LEFT OUTER JOIN " . $this->db->table("user") . " as user ON user.id = permission.user_id WHERE " . $criteria . " limit " . $rows . " offset " . $start)->rows();

		$list = array();
		foreach ($rows as $row) {
			if (!isset($row["user_id"])) {
				$list[] = array("name" => $row["name"], "subject" => $row["subject"], "user_id" => '0', "is_group" => 0, "value" => $row["value"]);
			} else {
				$list[] = array("name" => $row["name"], "subject" => $row["subject"], "user_id" => $row["user_id"], "is_group" => $row["is_group"], "value" => $row["value"]);

			}
		}

		return array("start" => $start, "count" => count($rows), "total" => $count, "data" => $list);
	}

	public function cleanupItemIds($ids) {
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("permission") . " WHERE subject in (%s)", $this->db->arrayString($ids, TRUE)));
	}
}
?>