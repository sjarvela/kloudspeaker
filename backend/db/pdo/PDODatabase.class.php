<?php

/**
 * PDODatabase.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class PDODatabase {
	private $str;
	private $user;
	private $pw;
	private $type;
	private $tablePrefix;

	private $db = NULL;
	private $transaction = FALSE;

	public static function createFromConf($conf) {
		if (!isset($conf["str"]) || !isset($conf["user"]) or !isset($conf["password"])) {
			throw new ServiceException("INVALID_CONFIGURATION", "No PDO database information defined");
		}

		if (isset($conf["table_prefix"])) {
			$tablePrefix = $conf["table_prefix"];
		} else {
			$tablePrefix = "";
		}

		$db = new PDODatabase($conf["str"], $conf["user"], $conf["password"], $tablePrefix);
		$db->connect();
		if (isset($conf["charset"])) {
			$db->setCharset($conf["charset"]);
		}

		return $db;
	}

	public static function createFromObj($db, $type) {
		$db = new PDODatabase($type, "", "", "", $db);
		$db->init();
		return $db;
	}

	public function __construct($str, $user, $pw, $tablePrefix, $db = NULL) {
		Logging::logDebug("PDO: " . $str);
		$this->str = $str;
		$this->user = $user;
		$this->pw = $pw;
		$this->tablePrefix = $tablePrefix;

		$this->type = $str;
		$p = strpos($str, ":");
		if ($p > 0) {
			$this->type = substr($str, 0, $p);
		}

		$this->db = $db;
	}

	public function type() {
		return $this->type;
	}

	public function str() {
		return $this->str;
	}

	public function user() {
		return $this->user;
	}

	public function password() {
		return $this->password;
	}

	public function tablePrefix() {
		return $this->tablePrefix;
	}

	public function isConnected() {
		return $this->db != NULL;
	}

	public function port() {
		return $this->port;
	}

	public function socket() {
		return $this->socket;
	}

	public function connect($selectDb = TRUE) {
		if ($this->db != NULL) {
			return;
		}

		try {
			$db = new PDO($this->str, $this->user, $this->pw);
		} catch (PDOException $e) {
			throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to database (" . $this->str . "), error: " . $e->getMessage());
		}

		$this->db = $db;
		$this->init();
	}

	public function init() {
		if ($this->type == "sqlite") {
			$this->db->sqliteCreateFunction('REGEX', 'sqlite_regex_match', 2);
		}

	}

	public function setCharset($charset) {
		$this->db->exec("SET CHARACTER SET " . $charset);
	}

	public function databaseExists() {
		return false; //TODO mysql_select_db($this->database, $this->db);
	}

	public function table($name) {
		return $this->tablePrefix . $name;
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

		$result = $this->db->query($query);
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . Util::array2str($this->db->errorInfo()));
		}

		return new Result($this->db, $result);
	}

	public function queries($sql) {
		if (Logging::isDebug()) {
			Logging::logDebug("DB: " . $sql);
		}

		try {
			$this->db->exec($sql);
			//$stmt->execute();
		} catch (PDOException $e) {
			if (Logging::isDebug()) {
				Logging::logDebug("ERROR: " . $e->getMessage());
			}

			throw new ServiceException("INVALID_CONFIGURATION", "Error executing queries (" . (strlen($sql) > 40 ? substr($sql, 0, 40) . "..." : $sql) . "...): " . $e->getMessage());
		}
	}

	public function execSqlFile($file) {
		$sql = file_get_contents($file);
		if (!$sql) {
			throw new ServiceException("INVALID_REQUEST", "Error reading sql file (" . $file . ")");
		}

		$sql = str_replace('{TABLE_PREFIX}', (isset($this->tablePrefix) and $this->tablePrefix != '') ? $this->tablePrefix : '', $sql);
		$this->queries($sql);
	}

	public function startTransaction() {
		if ($this->transaction) {
			return;
		}

		if (!$this->db->beginTransaction()) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error starting transaction: " . Util::array2str($this->db->errorInfo()));
		}

		$this->transaction = TRUE;
	}

	public function commit() {
		if (!$this->db->commit()) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error committing transaction: " . Util::array2str($this->db->errorInfo()));
		}

		$this->transaction = FALSE;
	}

	public function rollback() {
		if (!$this->db->rollBack()) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error rollbacking transaction: " . Util::array2str($this->db->errorInfo()));
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

		$r = $this->db->quote($s);
		if (!$quote) {
			return trim($r, "'");
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
		return $this->db->lastInsertId();
	}
}

class Result {
	private $db;
	private $result;
	private $rows = NULL;

	public function __construct($db, $result) {
		$this->db = $db;
		$this->result = $result;
	}

	public function count() {
		$rows = $this->getRows();
		if (!$rows) {
			return 0;
		}

		return count($rows);
	}

	public function affected() {
		return $this->result->rowCount();
	}

	private function getRows() {
		if ($this->rows != NULL) {
			return $this->rows;
		}

		$this->rows = $this->result->fetchAll(PDO::FETCH_BOTH);
		return $this->rows;
	}

	public function rows() {
		return $this->getRows();
	}

	public function values($col) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		$list = array();
		foreach ($rows as $row) {
			$list[] = $row[$col];
		}
		return $list;
	}

	public function valueMap($keyCol, $valueCol = NULL, $valueCol2 = NULL) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		$list = array();
		foreach ($rows as $row) {
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
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		$list = array();
		foreach ($rows as $row) {
			$key = $row[$keyCol];
			if (!isset($list[$key])) {
				$list[$key] = array();
			}

			$list[$key][] = $row;
		}
		return $list;
	}

	public function firstRow() {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		if (count($rows) == 0) {
			return NULL;
		}

		return $rows[0];
	}

	public function firstValue($val) {
		$ret = $this->firstRow();
		if (!$ret) {
			return NULL;
		}

		return $ret[$val];
	}

	public function value($r = 0, $f = 0) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		if (count($rows) <= $r) {
			return NULL;
		}

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