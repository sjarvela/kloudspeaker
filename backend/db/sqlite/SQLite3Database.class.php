<?php

/**
 * SQLiteDatabase.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class KloudspeakerSQLite3Database {
	private $file;
	private $db = NULL;
	private $transaction = FALSE;

	public static function createFromConf($conf) {
		if (!isset($conf["file"])) {
			throw new ServiceException("INVALID_CONFIGURATION", "No SQLite database file defined");
		}

		$file = $conf["file"];
		$db = new KloudspeakerSQLite3Database($file);
		$db->connect();
		return $db;
	}

	public function __construct($file) {
		Logging::logDebug("SQLite DB: " . $file);
		$this->file = $file;
	}

	public function type() {
		return "sqlite";
	}

	public function databaseExists() {
		return file_exists($this->file);
	}

	public function file() {
		return $this->file;
	}

	public function isConnected() {
		return $this->db != NULL;
	}

	public function connect() {
		$db = new SQLite3($this->file);
		if (!$db) {
			throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to database (file=" . $this->file . ")");
		}

		$this->db = $db;
		$this->registerRegex();
		$this->db->busyTimeout(5000);
	}

	public function registerRegex() {
		$this->db->createFunction('REGEX', 'sqlite_regex_match', 2);
	}

	public function table($name) {
		return $name;
	}

	public function update($query) {
		$result = $this->query($query);
		$affected = $result->affected();
		$result->free();
		return $affected;
	}

	public function query($query) {
		if (Logging::isDebug()) {
			Logging::logDebug("DB: " . $query);
		}

		$result = $this->db->query(str_replace("`", "", $query));
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . $this->db->lastErrorMsg());
		}

		return new Result($this->db, $result);
	}

	public function execSqlFile($file) {
		$sql = file_get_contents($file);
		if (!$sql) {
			throw new ServiceException("INVALID_REQUEST", "Error reading sql file (" . $file . ")");
		}

		$sql = str_replace("{TABLE_PREFIX}", "", str_replace("`", "", $sql));
		$this->queries($sql);
	}

	public function queries($query) {
		if (Logging::isDebug()) {
			Logging::logDebug("DB: " . $query);
		}

		$result = $this->db->exec($query);
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . $this->db->lastErrorMsg());
		}

		return TRUE;
	}

	public function startTransaction() {
		if ($this->transaction) {
			return;
		}

		$result = $this->db->exec("BEGIN;");
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error starting transaction: " . $this->db->lastErrorMsg());
		}

		$this->transaction = TRUE;
	}

	public function commit() {
		if (!$this->transaction) {
			return;
		}

		$result = $this->db->exec("COMMIT;");
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error committing transaction: " . $this->db->lastErrorMsg());
		}

		$this->transaction = FALSE;
	}

	public function rollback() {
		if (!$this->transaction) {
			return;
		}

		$result = $this->db->exec("ROLLBACK;");
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error rollbacking transaction: " . $this->db->lastErrorMsg());
		}

		$this->transaction = FALSE;
	}

	public function isTransaction() {
		return $this->transaction;
	}

	public function string($s, $quote = FALSE) {
		if ($s === NULL) {
			return 'NULL';
		}

		$r = $this->db->escapeString($s);
		if ($quote) {
			return "'" . $r . "'";
		}

		return $r;
	}

	public function arrayString($a, $quote = FALSE) {
		$result = '';
		$first = TRUE;
		foreach ($a as $s) {
			if (!$first) {
				$result .= ',';
			}

			if ($quote) {
				$result .= "'" . $s . "'";
			} else {
				$result .= $s;
			}

			$first = FALSE;
		}
		return $result;
	}

	public function lastId() {
		return $this->db->lastInsertRowID();
	}
}

class Result {
	private $db;
	private $result;

	public function __construct($db, $result) {
		$this->db = $db;
		$this->result = $result;
	}

	public function count() {
		return count($this->rows(FALSE));
	}

	public function affected() {
		return $this->db->changes();
	}

	public function rows($free = TRUE) {
		$list = array();
		while ($row = $this->result->fetchArray(SQLITE3_BOTH)) {
			$list[] = $row;
		}
		if ($free) {
			$this->free();
		}

		return $list;
	}

	public function values($col) {
		$list = array();
		while ($row = $this->result->fetchArray(SQLITE3_ASSOC)) {
			$list[] = $row[$col];
		}
		$this->free();
		return $list;
	}

	public function firstValue($val) {
		$ret = $this->firstRow();
		return $ret[$val];
	}

	public function valueMap($keyCol, $valueCol = NULL, $valueCol2 = NULL) {
		$list = array();
		while ($row = $this->result->fetchArray(SQLITE3_ASSOC)) {
			if ($valueCol == NULL) {
				$list[$row[$keyCol]] = $row;
			} else {
				if ($valueCol2) {
					$list[$row[$keyCol]] = array($valueCol => $row[$valueCol], $valueCol2 => $row[$valueCol2]);
				} else {
					$list[$row[$keyCol]] = $row[$valueCol];
				}
			}
		}
		$this->free();
		return $list;
	}

	public function listMap($keyCol) {
		$list = array();
		while ($row = $this->result->fetchArray(SQLITE3_ASSOC)) {
			$key = $row[$keyCol];
			if (!isset($list[$key])) {
				$list[$key] = array();
			}

			$list[$key][] = $row;
		}
		$this->free();
		return $list;
	}

	public function firstRow() {
		$ret = $this->result->fetchArray(SQLITE3_ASSOC);
		$this->free();
		return $ret;
	}

	public function value($r = 0, $f = 0) {
		$rows = $this->rows();
		$row = $rows[$r];
		return $row[$f];
	}

	public function free() {
		if ($this->result === TRUE or $this->result === FALSE) {
			return;
		}

		$this->result->finalize();
		$this->result = NULL;
	}
}

function sqlite_regex_match($str, $regex) {
	if (preg_match($regex, $str, $matches)) {
		return $matches[0];
	}
	return false;
}
?>