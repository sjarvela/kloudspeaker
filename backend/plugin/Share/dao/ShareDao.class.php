<?php

/**
 * ShareDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ShareDao {
	private $env;

	public function __construct($env) {
		$this->env = $env;
	}

	public function getShareCount($item, $userId) {
		$db = $this->env->db();
		return $db->query("select count('id') from " . $db->table("share") . " where item_id = " . $db->string($item->id(), TRUE) . " and user_id = " . $db->string($userId, TRUE))->value(0);
	}

	public function getShare($id, $mustBeValidAfter = NULL) {
		$db = $this->env->db();
		$query = "select id, name, item_id, active, restriction from " . $db->table("share") . " where active=1 and id = " . $db->string($id, TRUE);
		if ($mustBeValidAfter) {
			$query .= ' and (expiration is null or expiration >= ' . $db->string($mustBeValidAfter) . ')';
		}

		return $db->query($query)->firstRow();
	}

	public function getShareHash($id) {
		$db = $this->env->db();
		$query = "select hash, salt from " . $db->table("share_auth") . " where id = " . $db->string($id, TRUE);
		return $db->query($query)->firstRow();
	}

	public function getUserShares($userId) {
		$db = $this->env->db();
		$list = $db->query("select id, user_id, item_id, name, expiration, active, restriction from " . $db->table("share") . " where user_id = " . $db->string($userId, TRUE) . " order by item_id asc, created asc")->rows();

		$res = array();
		$itemId = FALSE;
		$userId = FALSE;
		foreach ($list as $s) {
			//Logging::logDebug(Util::array2str($s));
			if ($s["user_id"] != $userId) {
				$res[$s["user_id"]] = array();
			}
			$userId = $s["user_id"];

			if ($s["item_id"] != $itemId) {
				$res[$userId][$s["item_id"]] = array();
			}
			$itemId = $s["item_id"];

			$res[$userId][$itemId][] = array("id" => $s["id"], "name" => $s["name"], "expiration" => $s["expiration"], "active" => ($s["active"] == 1), "restriction" => $s["restriction"]);
		}
		return $res;
	}

	public function getShares($itemId, $userId) {
		$db = $this->env->db();
		$list = $db->query("select id, name, expiration, active, restriction from " . $db->table("share") . " where item_id = " . $db->string($itemId, TRUE) . " and user_id = " . $db->string($userId, TRUE) . " order by created asc")->rows();

		$res = array();
		foreach ($list as $s) {
			$res[] = array("id" => $s["id"], "name" => $s["name"], "expiration" => $s["expiration"], "active" => ($s["active"] == 1), "restriction" => $s["restriction"]);
		}

		return $res;
	}

	public function processQuery($q) {
		$db = $this->env->db();

		$criteria = "1=1";
		if (isset($q["user_id"])) {
			$criteria .= " and user_id = " . $db->string($q["user_id"], TRUE);
		}

		if (isset($q["item"])) {
			if ($q["item"] == 'filesystem_item' and isset($q["item_id"])) {
				$criteria .= " and item_id = " . $db->string($q["item_id"], TRUE);
			} else if ($q["item"] == 'filesystem_child' and isset($q["item_id"])) {
				$item = $this->env->filesystem()->item($q["item_id"]);
				$location = str_replace("'", "\'", $item->location());
				$criteria .= sprintf(" AND item_id in (select id from " . $db->table("item_id") . " where path like '%s%%')", $location);
			} else if ($q["item"] == 'none') {
				$criteria .= " AND item_id like '%!_%' escape '!'";
			}
		}

		$total = $db->query("select count(id) FROM " . $db->table("share") . " WHERE " . $criteria)->value(0);
		$rows = isset($q["count"]) ? $q["count"] : 50;
		$start = isset($q["start"]) ? $q["start"] : 0;

		$list = $db->query("select id, user_id, item_id, name, expiration, active, restriction from " . $db->table("share") . " WHERE " . $criteria . " order by user_id asc, item_id asc, created asc" . " limit " . $rows . " offset " . $start)->rows();
		return array("start" => $start, "count" => count($list), "total" => $total, "data" => $list);
	}

	public function getShareUsers($i) {
		$db = $this->env->db();
		if (is_array($i)) {
			$itemIds = array();
			foreach ($i as $item) {
				$itemIds[] = $item->id();
			}

			$itemIds = sprintf("item_id in (%s)", $db->arrayString($itemIds, TRUE));

			//				return $db->query("select distinct user_id from ".$db->table("share")." where ".$itemIds)->values("user_id")." group by item_id";
		} else {
			$itemIds = "item_id = " . $db->string($i->id(), TRUE);
		}

		return $db->query("select distinct item_id, user_id from " . $db->table("share") . " where " . $itemIds . " group by item_id")->rows();
//			return $db->query("select distinct user_id from ".$db->table("share")." where ".$itemId)->values("user_id");
	}

	public function getUserSharesForChildren($p, $currentUser) {
		$db = $this->env->db();
		/*$parentLocation = $db->string(str_replace("\\", "\\\\", $p->location()));	//itemidprovider

		if (strcasecmp("mysql", $this->env->db()->type()) == 0) {
			$itemFilter = "select id from " . $db->table("item_id") . " where path REGEXP '^" . $parentLocation . "[^/]+[/]?$'";
		} else {
			$itemFilter = "select id from " . $db->table("item_id") . " where REGEX(path, \"#^" . $parentLocation . "[^/]+[/]?$#\")";
		}*/
		$pathFilter = $this->env->filesystem()->itemIdProvider()->pathQueryFilter($p, FALSE, NULL);
		$itemFilter = "select id from " . $db->table("item_id") . " where ".$pathFilter;

		return $db->query("select item_id, sum(case when user_id = " . $db->string($currentUser, TRUE) . " then 1 else 0 end) as own, sum(case when user_id <> " . $db->string($currentUser, TRUE) . " then 1 else 0 end) as other from " . $db->table("share") . " where item_id in (" . $itemFilter . ") group by item_id")->valueMap("item_id", "own", "other");
	}

	public function getUserSharesForItems($items, $currentUser) {
		$ids = array();
		foreach ($items as $i) {
			$ids[] = $i->id();
		}

		$db = $this->env->db();

		return $db->query("select item_id, sum(case when user_id = " . $db->string($currentUser, TRUE) . " then 1 else 0 end) as own, sum(case when user_id <> " . $db->string($currentUser, TRUE) . " then 1 else 0 end) as other from " . $db->table("share") . " where item_id in (" . $db->arrayString($ids, TRUE) . ") group by item_id")->valueMap("item_id", "own", "other");
	}

	public function addShare($id, $itemId, $name, $userId, $expirationTime, $time, $active = TRUE, $restriction = FALSE) {
		$restrictionType = NULL;
		if (is_array($restriction) and isset($restriction["type"])) {
			if ($restriction["type"] == "private") {
				$restrictionType = "private";
			} else if ($restriction["type"] == "pw" and isset($restriction["value"]) and strlen($restriction["value"]) > 0) {
				$restrictionType = "pw";
			}
		}

		$db = $this->env->db();
		$db->startTransaction();
		$db->update(sprintf("INSERT INTO " . $db->table("share") . " (id, name, item_id, user_id, expiration, created, active, restriction) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", $db->string($id, TRUE), $db->string($name, TRUE), $db->string($itemId, TRUE), $db->string($userId, TRUE), $db->string($expirationTime), $db->string($time), ($active ? "1" : "0"), $db->string($restrictionType, TRUE)));

		if ($restrictionType == "pw") {
			$this->createAuth($db, $id, $restriction["value"]);
		}

		$db->commit();
	}

	private function createAuth($db, $id, $pw) {
		$hash = $this->env->passwordHash()->createHash($pw);
		$db->update(sprintf("INSERT INTO " . $db->table("share_auth") . " (id, hash, salt) VALUES (%s, %s, %s)", $db->string($id, TRUE), $db->string($hash["hash"], TRUE), $db->string($hash["salt"], TRUE)));
	}

	public function editShare($id, $name, $expirationTime, $active, $restriction) {
		$old = $this->getShare($id);

		$oldRestrictionType = $old["restriction"];
		$restrictionType = NULL;
		$restrictionPwValue = FALSE;
		if (is_array($restriction) and isset($restriction["type"])) {
			if ($restriction["type"] == "private") {
				$restrictionType = "private";
			} else if ($restriction["type"] == "pw") {
				if ($oldRestrictionType != "pw" and !isset($restriction["value"]) or strlen($restriction["value"]) == 0) {
					throw new ServiceException("INVALID_REQUEST", "pw missing");
				}

				$restrictionPwValue = (isset($restriction["value"]) and strlen($restriction["value"]) > 0);
				$restrictionType = "pw";
			}
		}

		$db = $this->env->db();
		$db->startTransaction();

		if ($restrictionType != "pw" or $restrictionPwValue) {
			$db->update("DELETE FROM " . $db->table("share_auth") . " WHERE id = " . $db->string($id, TRUE));
		}

		$db->update(sprintf("UPDATE " . $db->table("share") . " SET name = %s, active = %s, expiration = %s, restriction = %s WHERE id=%s", $db->string($name, TRUE), ($active ? "1" : "0"), $db->string($expirationTime), $db->string($restrictionType, TRUE), $db->string($id, TRUE)));
		if ($restrictionPwValue) {
			$this->createAuth($db, $id, $restriction["value"]);
		}

		$db->commit();
	}

	public function updateShares($ids, $update) {
		$db = $this->env->db();
		$idList = $db->arrayString($ids, TRUE);

		$upd = "";
		if (isset($update["active"])) {
			$upd .= "active = " . ($update["active"] ? "1" : "0");
		}

		$db->update("UPDATE " . $db->table("share") . " set " . $upd . " WHERE id in (" . $idList . ")");
		return TRUE;
	}

	public function deleteShare($id) {
		$db = $this->env->db();
		$db->startTransaction();

		$success = $db->update("DELETE FROM " . $db->table("share") . " WHERE id = " . $db->string($id, TRUE));
		if ($success) {
			$db->update("DELETE FROM " . $db->table("share_auth") . " WHERE id = " . $db->string($id, TRUE));
		}

		$db->commit();
		return $success;
	}

	public function deleteSharesById($ids) {
		$db = $this->env->db();
		$idList = $db->arrayString($ids, TRUE);

		$db->startTransaction();

		$success = $db->update("DELETE FROM " . $db->table("share") . " WHERE id in (" . $idList . ")");
		if ($success) {
			$db->update("DELETE FROM " . $db->table("share_auth") . " WHERE id in (" . $idList . ")");
		}

		$db->commit();
		return $success;
	}

	public function deleteShares($item) {
		$db = $this->env->db();
		$db->startTransaction();

		if ($item->isFile()) {
			$criteria = "item_id = " . $db->string($item->id(), TRUE);
		} else {
			$criteria = sprintf("item_id in (select id from " . $db->table("item_id") . " where path like '%s%%')", str_replace("'", "\'", $db->string($item->location())));
		}

		$db->update("DELETE FROM " . $db->table("share_auth") . " WHERE id in (SELECT id FROM " . $db->table("share") . " WHERE " . $criteria . ")");
		$success = $db->update("DELETE FROM " . $db->table("share") . " WHERE " . $criteria);

		$db->commit();
		return $success;
	}

	public function deleteSharesForItem($itemId) {
		$db = $this->env->db();
		$db->startTransaction();

		$criteria = "item_id = " . $db->string($itemId, TRUE);
		$db->update("DELETE FROM " . $db->table("share_auth") . " WHERE id in (SELECT id FROM " . $db->table("share") . " WHERE " . $criteria . ")");
		$success = $db->update("DELETE FROM " . $db->table("share") . " WHERE " . $criteria);

		$db->commit();
		return $success;
	}

	public function __toString() {
		return "ShareDao";
	}
}
?>
