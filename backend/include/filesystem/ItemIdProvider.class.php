<?php

/**
 * ItemIdProvider.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class ItemIdProvider {
	private $env;
	private $cache = array();

	function __construct($env) {
		$this->env = $env;
	}

	public function getItemId($p) {
		if (!array_key_exists($p, $this->cache)) {
			$this->cache[$p] = $this->getOrCreateItemId($p);
		}

		return $this->cache[$p];
	}

	public function getLocation($id) {
		$db = $this->env->db();
		$query = "select path from " . $db->table("item_id") . " where id=" . $db->string($id, TRUE);
		$result = $db->query($query);

		if ($result->count() === 1) {
			return $result->value(0, "path");
		}

		throw new ServiceException("No item id found " . $id);
	}

	public function loadRoots() {
		$db = $this->env->db();

		if (strcmp("mysql", $this->env->db()->type()) == 0) {
			$pathFilter = "path REGEXP '^.:[/\\\\]$'";
		} else {
			$pathFilter = "REGEX(path, \"#^.:[/\\\\]$#\")";
		}

		$query = "select id, path from " . $db->table("item_id") . " where " . $pathFilter;
		foreach ($db->query($query)->rows() as $r) {
			$this->cache[$r["path"]] = $r["id"];
		}
	}

	public function load($parent, $recursive = FALSE) {
		$db = $this->env->db();

		if ($recursive) {
			$pathFilter = "path like '" . $db->string($this->itemPath($parent)) . "%'";
		} else {
			if (strcmp("mysql", $db->type()) == 0) {
				$pathFilter = "path REGEXP '^" . $db->string(str_replace("\\", "\\\\", $this->itemPath($parent))) . "[^/\\\\]+[/\\\\]?$'";
			} else {
				$pathFilter = "REGEX(path, \"#^" . $db->string(str_replace("\\", "\\\\", $this->itemPath($parent))) . "[^/\\\\]+[/\\\\]?$#\")";
			}
		}

		$query = "select id, path from " . $db->table("item_id") . " where " . $pathFilter;
		foreach ($db->query($query)->rows() as $r) {
			$this->cache[$r["path"]] = $r["id"];
		}
	}

	private function getOrCreateItemId($p) {
		$db = $this->env->db();
		$query = "select id from " . $db->table("item_id") . " where path=" . $db->string($p, TRUE);
		$result = $db->query($query);

		if ($result->count() === 1) {
			return $result->value(0, "id");
		}

		$id = uniqid("");
		$db->update(sprintf("INSERT INTO " . $db->table("item_id") . " (id, path) VALUES (%s,%s)", $db->string($id, TRUE), $db->string($p, TRUE)));
		return $id;
	}

	public function delete($item) {
		$db = $this->env->db();
		if ($item->isFile()) {
			return $db->update("DELETE FROM " . $db->table("item_id") . " WHERE id = " . $db->string($item->id(), TRUE));
		} else {
			return $db->update(sprintf("DELETE FROM " . $db->table("item_id") . " WHERE path like '%s%%'", $db->string(str_replace("\\", "\\\\", $this->itemPath($item)))));
		}

	}

	public function deleteIds($ids) {
		$db = $this->env->db();
		return $db->update("DELETE FROM " . $db->table("item_id") . " WHERE id in (" . $db->arrayString($ids, TRUE) . ")");
	}

	public function move($item, $to) {
		$db = $this->env->db();
		if ($item->isFile()) {
			$p = $db->string($this->itemPath($to), TRUE);
			$db->update("DELETE FROM " . $db->table("item_id") . " WHERE path = " . $p);
			return $db->update("UPDATE " . $db->table("item_id") . " SET path = " . $p . " where id = " . $db->string($item->id(), TRUE));
		} else {
			$path = $this->itemPath($item);
			$toPath = rtrim($this->itemPath($to), "/\\");

			$len = mb_strlen($path, "UTF-8");
			//Logging::logDebug("len ".$path." = ".$len);
			//Logging::logDebug("to ".$toPath);

			if ($db->type() == "sqlite") {
				$update = "('%s' || SUBSTR(path, %d)";
			} else {
				$update = "CONCAT('%s', SUBSTR(path, %d)";
			}

			return $db->update(sprintf("UPDATE " . $db->table("item_id") . " SET path=" . $update . ") WHERE path like '%s%%'", $db->string($toPath), $len, $db->string(str_replace("\\", "\\\\", $path))));
		}
	}

	private function itemPath($i) {
		return $i->location();
	}

	public function __toString() {
		return "ItemIdProvider";
	}
}
?>