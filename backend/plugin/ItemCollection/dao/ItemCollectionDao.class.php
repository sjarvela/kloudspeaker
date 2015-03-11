<?php

/**
 * ItemCollectionDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ItemCollectionDao {
	private $env;

	public function __construct($env) {
		$this->env = $env;
	}

	public function getItemCollection($id, $userId = NULL) {
		$db = $this->env->db();
		$userCriteria = "";
		if ($userId != NULL) {
			$userCriteria = "and user_id=" . $db->string($userId, TRUE);
		}

		$collections = $db->query("select id, name from " . $db->table("itemcollection") . " where id = " . $db->string($id, TRUE) . " " . $userCriteria)->rows();
		if (count($collections) != 1) {
			return FALSE;
		}
		$collection = $collections[0];

		$list = $db->query("select item_id from " . $db->table("itemcollection_item") . " where collection_id = " . $db->string($id, TRUE) . " order by item_index asc")->rows();
		$items = array();
		foreach ($list as $c) {
			$items[] = $c["item_id"];
		}
		return array("id" => $collection["id"], "name" => $collection["name"], "items" => $items);
	}

	public function getUserItemCollections($userId) {
		$db = $this->env->db();
		$list = $db->query("select ic.id as id, ic.name as name, ici.item_id as item_id from " . $db->table("itemcollection") . " ic left outer join " . $db->table("itemcollection_item") . " ici on ici.collection_id = ic.id where ic.user_id = " . $db->string($userId, TRUE) . " order by ic.created asc, ici.item_index asc")->rows();

		$res = array();
		if (!$list or count($list) == 0) {
			return $res;
		}

		$id = FALSE;
		$items = array();
		$collection = FALSE;
		$prev = NULL;
		foreach ($list as $c) {
			if ($prev == NULL) {
				$prev = $c;
			}

			if (strcmp($prev["id"], $c["id"]) != 0) {
				$res[] = array("id" => $prev["id"], "name" => $prev["name"], "items" => $items);
				$items = array();
			}
			if ($c["item_id"] != NULL) {
				$items[] = $c["item_id"];
			}

			$prev = $c;
		}
		$res[] = array("id" => $prev["id"], "name" => $prev["name"], "items" => $items);
		return $res;
	}

	public function addUserItemCollection($userId, $name, $items, $time) {
		$db = $this->env->db();
		$db->startTransaction();
		$db->update(sprintf("INSERT INTO " . $db->table("itemcollection") . " (name, user_id, created) VALUES (%s, %s, %s)", $db->string($name, TRUE), $db->string($userId, TRUE), $db->string($time)));
		$cid = $db->lastId();

		$this->addCollectionItemRows($db, $cid, $items);
		$db->commit();
	}

	private function addCollectionItemRows($db, $cid, $items) {
		$itemIds = $db->query("select item_id from " . $db->table("itemcollection_item") . " where collection_id = " . $db->string($cid, TRUE))->values("item_id");
		if (count($itemIds) > 0) {
			$maxInd = $db->query("select max(item_index) as max_ind from " . $db->table("itemcollection_item") . " where collection_id = " . $db->string($cid, TRUE))->value();
		} else {
			$maxInd = -1;
		}

		$ind = $maxInd + 1;

		foreach ($items as $i) {
			if (in_array($i["id"], $itemIds)) {
				continue;
			}

			$db->update(sprintf("INSERT INTO " . $db->table("itemcollection_item") . " (collection_id, item_id, item_index) VALUES (%s, %s, %s)", $db->string($cid, TRUE), $db->string($i["id"], TRUE), $db->string($ind++)));
			$itemIds[] = $i["id"];
		}
	}

	public function addCollectionItems($id, $userId, $items) {
		$db = $this->env->db();
		$list = $db->query("select id from " . $db->table("itemcollection") . " where user_id = " . $db->string($userId, TRUE) . " and id = " . $db->string($id, TRUE))->rows();
		if (count($list) == 0) {
			return FALSE;
		}

		$db->startTransaction();
		$this->addCollectionItemRows($db, $id, $items);
		$db->commit();
	}

	public function removeCollectionItems($id, $userId, $items) {
		$db = $this->env->db();
		$list = $db->query("select id from " . $db->table("itemcollection") . " where user_id = " . $db->string($userId, TRUE) . " and id = " . $db->string($id, TRUE))->rows();
		if (count($list) == 0) {
			return FALSE;
		}

		$list = array();
		foreach ($items as $item) {
			$list[] = $item["id"];
		}
		$db->update("DELETE FROM " . $db->table("itemcollection_item") . " WHERE collection_id = " . $db->string($id, TRUE) . " and item_id in (" . $db->arrayString($list, TRUE) . ")");
	}

	public function deleteUserItemCollection($id, $userId) {
		$db = $this->env->db();

		$list = $db->query("select id from " . $db->table("itemcollection") . " where user_id = " . $db->string($userId, TRUE) . " and id = " . $db->string($id, TRUE))->rows();
		if (count($list) == 0) {
			return FALSE;
		}

		$db->startTransaction();
		$db->update("DELETE FROM " . $db->table("itemcollection") . " WHERE id = " . $db->string($id, TRUE));
		$db->update("DELETE FROM " . $db->table("itemcollection_item") . " WHERE collection_id = " . $db->string($id, TRUE));
		$db->commit();
		return TRUE;
	}

	public function deleteUserItemCollections($userId) {
		$db = $this->env->db();

		$list = $db->query("select id from " . $db->table("itemcollection") . " where user_id = " . $db->string($userId, TRUE))->values("id");
		if (count($list) == 0) {
			return $list;
		}

		$db->startTransaction();
		$db->update("DELETE FROM " . $db->table("itemcollection") . " WHERE id in (" . $db->arrayString($list, TRUE) . ")");
		$db->update("DELETE FROM " . $db->table("itemcollection_item") . " WHERE collection_id in (" . $db->arrayString($list, TRUE) . ")");
		$db->commit();
		return $list;
	}

	public function deleteCollectionItems($item) {
		$db = $this->env->db();
		return $db->update("DELETE FROM " . $db->table("itemcollection_item") . " WHERE item_id = " . $db->string($item->id(), TRUE));
	}

	public function __toString() {
		return "ItemCollectionDao";
	}
}
?>
