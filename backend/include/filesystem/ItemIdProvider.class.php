<?php

/**
 * ItemIdProvider.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ItemIdProvider {
	const PATH_DELIMITER = "/";

	private $env;
	private $cache = array();
	private $convertPathDelimiter = FALSE;

	function __construct($env) {
		$this->env = $env;
		$this->convertPathDelimiter = (DIRECTORY_SEPARATOR != self::PATH_DELIMITER);
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
			$path = $result->value(0, "path");
			if ($this->convertPathDelimiter) {
				$path = str_replace(self::PATH_DELIMITER, DIRECTORY_SEPARATOR, $path);
			}
			return $path;
		}

		throw new ServiceException("No item id found " . $id);
	}

	public function loadRoots() {
		$db = $this->env->db();
		$query = "select id, path from " . $db->table("item_id") . " where level=1";
		foreach ($db->query($query)->rows() as $r) {
			$this->cache[$r["path"]] = $r["id"];
		}
	}

	public function load($parent, $recursive = FALSE) {
		$db = $this->env->db();
		$pathFilter = "path like '" . $db->string($this->itemQueryPath($parent)) . "%'";

		if (!$recursive)
			$pathFilter .= " and level=".($this->getLevel($parent) + 1);

		$query = "select id, path from " . $db->table("item_id") . " where " . $pathFilter;
		foreach ($db->query($query)->rows() as $r) {
			$this->cache[$r["path"]] = $r["id"];
		}
	}

	private function getOrCreateItemId($path) {
		$p = $path;
		if ($this->convertPathDelimiter) {
			$p = str_replace(DIRECTORY_SEPARATOR, self::PATH_DELIMITER, $p);
		}

		$db = $this->env->db();
		$query = "select id from " . $db->table("item_id") . " where path=" . $db->string($p, TRUE);
		$result = $db->query($query);

		if ($result->count() === 1) {
			$id = $result->value(0, "id");
			$this->cache[$p] = $id;
			return $id;
		}

		$id = uniqid("");
		$db->update(sprintf("INSERT INTO " . $db->table("item_id") . " (id, path, level) VALUES (%s,%s, %s)", $db->string($id, TRUE), $db->string($p, TRUE), $this->getLevel($path)));
		$this->cache[$p] = $id;
		return $id;
	}

	public function delete($item) {
		$db = $this->env->db();
		if ($item->isFile()) {
			return $db->update("DELETE FROM " . $db->table("item_id") . " WHERE id = " . $db->string($item->id(), TRUE));
		} else {
			return $db->update(sprintf("DELETE FROM " . $db->table("item_id") . " WHERE path like '%s%%'", $db->string($this->itemQueryPath($item))));
		}
	}

	public function deleteIds($ids) {
		$db = $this->env->db();
		return $db->update("DELETE FROM " . $db->table("item_id") . " WHERE id in (" . $db->arrayString($ids, TRUE) . ")");
	}

	public function move($item, $to) {
		$db = $this->env->db();
		if ($item->isFile()) {
			$p = $db->string($this->itemQueryPath($to), TRUE);
			$db->update("DELETE FROM " . $db->table("item_id") . " WHERE path = " . $p);
			$db->update("UPDATE " . $db->table("item_id") . " SET path = " . $p . ", level = -1 where id = " . $db->string($item->id(), TRUE));
		} else {
			$path = $this->itemQueryPath($item);
			$toPath = rtrim($this->itemQueryPath($to), self::PATH_DELIMITER);
			$len = mb_strlen($path, "UTF-8");

			if ($db->type() == "sqlite") {
				$update = "('%s' || SUBSTR(path, %d)";
			} else {
				$update = "CONCAT('%s', SUBSTR(path, %d)";
			}

			$db->update(sprintf("UPDATE " . $db->table("item_id") . " SET path=" . $update . ", level = -1 WHERE path like '%s%%'", $db->string($toPath), $len, $db->string($path)));			
		}
		return $db->update(sprintf("UPDATE " . $db->table("item_id") . " SET level = (LENGTH(path) - LENGTH(REPLACE(SUBSTR(path, 1, LENGTH(path)-1), '/', ''))) WHERE level = -1"));
	}

	public function itemQueryPath($i, $escape = FALSE) {
		$path = is_string($i) ? $i : $i->location();
		if ($this->convertPathDelimiter) {
			$path = str_replace(DIRECTORY_SEPARATOR, self::PATH_DELIMITER, $path);
		}
		if ($escape) $path = Util::escapePathRegex($path, TRUE);
		return $path;
	}

	public function pathQueryFilter($parent, $recursive = FALSE, $prefix = "i") {
		$pathFilter = ($prefix != NULL ? $prefix.".path" : "path") . " like '" . $this->env->db()->string(str_replace("'", "\'", $this->itemQueryPath($parent))) . "%'";
		if (!$recursive) {
			$pathFilter = $pathFilter . " and " . ($prefix != NULL ? $prefix.".level" : "level") . "=" . ($this->getLevel($parent) + 1);
		}
		return $pathFilter;
	}

	private function getLevel($i) {
		$path = is_string($i) ? $i : $i->location();
		if ($this->convertPathDelimiter) {
			$path = str_replace(DIRECTORY_SEPARATOR, self::PATH_DELIMITER, $path);
		}
		return substr_count(substr($path, 0, -1), self::PATH_DELIMITER) + 1;
	}

	public function __toString() {
		return "ItemIdProvider";
	}
}
?>