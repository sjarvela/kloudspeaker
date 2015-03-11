<?php

/**
 * SQLiteDatabase.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class kloudspeakerSQLiteDatabase {
	private $file;
	private $db = NULL;
	private $transaction = FALSE;

	public static function createFromConf($conf) {
		if (!isset($conf["file"])) {
			throw new ServiceException("INVALID_CONFIGURATION", "No SQLite database file defined");
		}

		$file = $conf["file"];
		$db = new kloudspeakerSQLiteDatabase($file);
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
		$db = sqlite_open($this->file, 0666, $error);
		if (!$db) {
			throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to database (file=" . $this->file . "), error: " . $error);
		}

		$this->db = $db;
		$this->registerRegex();
	}

	public function registerRegex() {
		sqlite_create_function($this->db, 'REGEX', 'sqlite_regex_match', 2);
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

		$result = @sqlite_query(str_replace("`", "", $query), $this->db, SQLITE_NUM, $err);
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . $err);
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

		@sqlite_query($query, $this->db, SQLITE_NUM, $err);
		if ($err) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . $err);
		}

		return TRUE;
	}

	public function startTransaction() {
		if ($this->transaction) {
			return;
		}

		$result = @sqlite_query("BEGIN;", $this->db);
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error starting transaction: " . sqlite_last_error($this->db));
		}

		$this->transaction = TRUE;
	}

	public function commit() {
		$result = @sqlite_query("COMMIT;", $this->db);
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error committing transaction: " . sqlite_last_error($this->db));
		}

		$this->transaction = FALSE;
	}

	public function rollback() {
		$result = @sqlite_query("ROLLBACK;", $this->db);
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error rollbacking transaction: " . sqlite_last_error($this->db));
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

		$r = sqlite_escape_string($s);
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
		return sqlite_last_insert_rowid($this->db);
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
		return sqlite_num_rows($this->result);
	}

	public function affected() {
		return sqlite_changes($this->db);
	}

	public function rows() {
		$list = array();
		while ($row = sqlite_fetch_array($this->result, SQLITE_BOTH)) {
			$list[] = $row;
		}
		return $list;
	}

	public function values($col) {
		$list = array();
		while ($row = sqlite_fetch_array($this->result, SQLITE_ASSOC)) {
			$list[] = $row[$col];
		}
		return $list;
	}

	public function firstValue($val) {
		$ret = $this->firstRow();
		return $ret[$val];
	}

	public function valueMap($keyCol, $valueCol = NULL, $valueCol2 = NULL) {
		$list = array();
		while ($row = sqlite_fetch_array($this->result, SQLITE_ASSOC)) {
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
		return $list;
	}

	public function listMap($keyCol) {
		$list = array();
		while ($row = sqlite_fetch_array($this->result, SQLITE_ASSOC)) {
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
		$ret = sqlite_fetch_array($this->result, SQLITE_ASSOC);
		return $ret;
	}

	public function value($r = 0, $f = 0) {
		$rows = $this->rows();
		$row = $rows[$r];
		return $row[$f];
	}

	public function free() {
	}
}

function sqlite_regex_match($str, $regex) {
	if (preg_match($regex, $str, $matches)) {
		return $matches[0];
	}
	return false;
}
?>