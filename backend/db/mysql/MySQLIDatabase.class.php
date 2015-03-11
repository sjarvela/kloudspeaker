<?php

/**
 * MySQLIDatabase.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class MySQLIDatabase {
	private $host;
	private $user;
	private $pw;
	private $database;
	private $tablePrefix;
	private $port;
	private $socket;
	private $engine;

	private $db = NULL;
	private $transaction = FALSE;

	public static function createFromConf($conf) {
		if (!isset($conf["user"]) or !isset($conf["password"])) {
			throw new ServiceException("INVALID_CONFIGURATION", "No MySQL db user information defined");
		}

		if (isset($conf["host"])) {
			$host = $conf["host"];
		} else {
			$host = "localhost";
		}

		if (isset($conf["database"])) {
			$database = $conf["database"];
		} else {
			$database = "mollify";
		}

		if (isset($conf["table_prefix"])) {
			$tablePrefix = $conf["table_prefix"];
		} else {
			$tablePrefix = "";
		}

		if (isset($conf["port"])) {
			$port = $conf["port"];
		} else {
			$port = NULL;
		}

		if (isset($conf["socket"])) {
			$socket = $conf["socket"];
			$port = NULL;
		} else {
			$socket = NULL;
		}

		if (isset($conf["engine"])) {
			$engine = $conf["engine"];
		} else {
			$engine = NULL;
		}

		$db = new MySQLIDatabase($host, $conf["user"], $conf["password"], $database, $tablePrefix, $port, $socket, $engine);
		$db->connect();
		if (isset($conf["charset"])) {
			$db->setCharset($conf["charset"]);
		}

		return $db;
	}

	public function __construct($host, $user, $pw, $database, $tablePrefix, $port, $socket, $engine = NULL) {
		Logging::logDebug("MySQLi DB: " . $user . "@" . $host . ":" . $database . "(" . $tablePrefix . ")");

		$this->host = $host;
		$this->user = $user;
		$this->pw = $pw;
		$this->database = $database;
		$this->tablePrefix = $tablePrefix;
		$this->port = $port;
		$this->socket = $socket;
		$this->engine = $engine;
	}

	public function type() {
		return "mysql";
	}

	public function host() {
		return $this->host;
	}

	public function user() {
		return $this->user;
	}

	public function password() {
		return $this->pw;
	}

	public function database() {
		return $this->database;
	}

	public function tablePrefix() {
		return $this->tablePrefix;
	}

	public function port() {
		return $this->port;
	}

	public function socket() {
		return $this->socket;
	}

	public function isConnected() {
		return $this->db != NULL;
	}

	public function connect($selectDb = TRUE) {
		try {
			if ($selectDb) {
				$db = @mysqli_connect($this->host, $this->user, $this->pw, $this->database, $this->port, $this->socket);
			} else {
				$db = @mysqli_connect($this->host, $this->user, $this->pw, "", $this->port, $this->socket);
			}
		} catch (mysqli_sql_exception $e) {
			throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to database (host=" . $this->host . ", user=" . $this->user . ", password=" . $this->pw . "), error: " . mysqli_connect_errno() . "/" . mysqli_connect_error());
		}
		if (!$db) {
			throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to database (host=" . $this->host . ", user=" . $this->user . ", password=" . $this->pw . "), error: " . mysqli_connect_errno() . "/" . mysqli_connect_error());
		}

		$this->db = $db;
	}

	public function setCharset($charset) {
		mysqli_set_charset($this->db, $charset);
	}

	public function databaseExists() {
		try {
			return mysqli_select_db($this->db, $this->database);
		} catch (mysqli_sql_exception $e) {
			return FALSE;
		}
	}

	public function selectDb() {
		if (!mysqli_select_db($this->db, $this->database)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Could not select database (" . $this->database . ") error: " . mysql_error($this->db));
		}
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

	public function query($query, $expectResult = TRUE) {
		if (Logging::isDebug()) {
			Logging::logDebug("DB QUERY: " . $query);
		}

		try {
			$result = @mysqli_query($this->db, $query);
		} catch (mysqli_sql_exception $e) {
			if (Logging::isDebug()) {
				Logging::logDebug("ERROR: " . $e);
			}

			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . mysqli_error($this->db));
		}
		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (" . $query . "): " . mysqli_error($this->db));
		}

		if (!$expectResult) {
			return TRUE;
		}

		return new MySQLIResult($this->db, $result);
	}

	public function queries($sql) {

		try {

			@mysqli_multi_query($this->db, $sql);
			do {
				if ($result = @mysqli_store_result($this->db)) {
					mysqli_free_result($result);
				}

				if (mysqli_error($this->db)) {
					throw new ServiceException("INVALID_CONFIGURATION", "Error executing queries (" . (strlen($sql) > 40 ? substr($sql, 0, 40) . "..." : $sql) . "): " . mysqli_error($this->db));
				}

				if (!mysqli_more_results($this->db)) {
					break;
				}

				mysqli_next_result($this->db);
			} while (TRUE);
		} catch (mysqli_sql_exception $e) {
			if (Logging::isDebug()) {
				Logging::logDebug("ERROR: " . $e);
			}

			throw new ServiceException("INVALID_CONFIGURATION", "Error executing queries (" . (strlen($sql) > 40 ? substr($sql, 0, 40) . "..." : $sql) . "...): " . mysqli_error($this->db));
		}
	}

	public function execSqlFile($file) {
		$sql = file_get_contents($file);
		if (!$sql) {
			throw new ServiceException("INVALID_REQUEST", "Error reading sql file (" . $file . ")");
		}

		$sql = str_replace('{TABLE_PREFIX}', (isset($this->tablePrefix) and $this->tablePrefix != '') ? $this->tablePrefix : '', $sql);
		$sql = str_replace('{ENGINE}', (isset($this->engine) and $this->engine != '') ? $this->engine : 'innodb', $sql);
		$this->queries($sql);
	}

	public function startTransaction() {
		if ($this->transaction) {
			return;
		}

		try {
			$result = @mysqli_query($this->db, "START TRANSACTION;");
		} catch (mysqli_sql_exception $e) {
			if (Logging::isDebug()) {
				Logging::logDebug("ERROR: " . $e);
			}

			throw new ServiceException("INVALID_CONFIGURATION", "Error starting transaction: " . mysqli_error($this->db));
		}

		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error starting transaction: " . mysqli_error($this->db));
		}

		$this->transaction = TRUE;
	}

	public function commit() {
		try {
			$result = @mysqli_query($this->db, "COMMIT;");
		} catch (mysqli_sql_exception $e) {
			if (Logging::isDebug()) {
				Logging::logDebug("ERROR: " . $e);
			}

			throw new ServiceException("INVALID_CONFIGURATION", "Error committing transaction: " . mysqli_error($this->db));
		}

		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error committing transaction: " . mysqli_error($this->db));
		}

		$this->transaction = FALSE;
	}

	public function rollback() {
		try {
			$result = @mysqli_query($this->db, "ROLLBACK;");
		} catch (mysqli_sql_exception $e) {
			if (Logging::isDebug()) {
				Logging::logDebug("ERROR: " . $e);
			}

			throw new ServiceException("INVALID_CONFIGURATION", "Error rollbacking transaction: " . mysqli_error($this->db));
		}

		if (!$result) {
			throw new ServiceException("INVALID_CONFIGURATION", "Error rollbacking transaction: " . mysqli_error($this->db));
		}

		$this->transaction = FALSE;
	}

	public function isTransaction() {
		return $this->transaction;
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

	public function string($s, $quote = FALSE) {
		if ($s === NULL) {
			return 'NULL';
		}

		$r = mysqli_real_escape_string($this->db, $s);
		if ($quote) {
			return "'" . $r . "'";
		}

		return $r;
	}

	public function lastId() {
		return mysqli_insert_id($this->db);
	}

	public function __toString() {
		return "MySQLIDatabase";
	}
}

class MySQLIResult {
	private $db;
	private $result;

	public function __construct($db, $result) {
		$this->db = $db;
		$this->result = $result;
	}

	public function count() {
		return mysqli_num_rows($this->result);
	}

	public function affected() {
		return mysqli_affected_rows($this->db);
	}

	public function rows() {
		$list = array();
		while ($row = mysqli_fetch_array($this->result)) {
			$list[] = $row;
		}
		mysqli_free_result($this->result);
		return $list;
	}

	public function values($col) {
		$list = array();
		while ($row = mysqli_fetch_assoc($this->result)) {
			$list[] = $row[$col];
		}
		mysqli_free_result($this->result);
		return $list;
	}

	public function firstRow() {
		$ret = mysqli_fetch_assoc($this->result);
		mysqli_free_result($this->result);
		return $ret;
	}

	public function firstValue($val) {
		$ret = $this->firstRow();
		return $ret[$val];
	}

	public function value($r = 0, $f = 0) {
		$rows = $this->rows();
		$row = $rows[$r];
		return $row[$f];
	}

	public function valueMap($keyCol, $valueCol = NULL, $valueCol2 = NULL) {
		$col2 = $valueCol2 != NULL;
		$list = array();
		while ($row = mysqli_fetch_assoc($this->result)) {
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
		mysqli_free_result($this->result);
		return $list;
	}

	public function listMap($keyCol) {
		$list = array();
		while ($row = mysqli_fetch_assoc($this->result)) {
			$key = $row[$keyCol];
			if (!isset($list[$key])) {
				$list[$key] = array();
			}

			$list[$key][] = $row;
		}
		mysqli_free_result($this->result);
		return $list;
	}

	public function free() {
		if ($this->result === TRUE or $this->result === FALSE) {
			return;
		}

		mysqli_free_result($this->result);
	}
}
?>