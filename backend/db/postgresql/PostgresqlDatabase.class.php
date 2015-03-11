<?php

	/**
	 * PostgresqlDatabase.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class PostgresqlDatabase {
		private $host;
		private $user;
		private $pw;
		private $database;
		private $tablePrefix;
		
		private $db = NULL;
		
		public static function createFromConf($conf) {
			if (!isset($conf["user"]) or !isset($conf["password"])) throw new ServiceException("INVALID_CONFIGURATION", "No PostgreSQL db information defined");
			
			if (isset($conf["host"])) $host = $conf["host"];
			else $host = "localhost";
			
			if (isset($conf["database"])) $database = $conf["database"];
			else $database = "mollify";

			if (isset($conf["table_prefix"])) $tablePrefix = $conf["table_prefix"];
			else $tablePrefix = "";
			
			$db = new PostgresqlDatabase($host, $conf["user"], $conf["password"], $database, $tablePrefix);
			$db->connect();
			//if (isset($conf["charset"])) $db->setCharset($conf["charset"]);
			return $db;
		}
		
		public function __construct($host, $user, $pw, $database, $tablePrefix) {
			Logging::logDebug("Postgresql DB: ".$user."@".$host.":".$database."(".$tablePrefix.")");
			$this->host = $host;
			$this->user = $user;
			$this->pw = $pw;
			$this->database = $database;
			$this->tablePrefix = $tablePrefix;
		}
		
		public function host() {
			return $this->host;
		}
		
		public function user() {
			return $this->user;
		}

		public function password() {
			return $this->password;
		}

		public function database() {
			return $this->database;
		}

		public function tablePrefix() {
			return $this->tablePrefix;
		}
		
		public function isConnected() {
			return $this->db != NULL;
		}
		
		public function connect($selectDb = TRUE) {
			$db = pg_connect("host=".$this->host." dbname=".$this->database." user=".$this->user". password=".$this->pw);
			if (!$db) throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to database (host=".$this->host.", user=".$this->user.", password=".$this->pw."), error: ".pg_last_error());
			$this->db = $db;
		}
		
		public function setCharset($charset) {
			// is this needed?
		}
		
		public function databaseExists() {
			return mysql_select_db($this->database, $this->db);
		}

		public function selectDb() {
			// is it possible in postgresql not to select db on connection?
		}

		public function table($name) {
			return $this->tablePrefix.$name;
		}
		
		public function update($query) {
			$result = $this->query($query);
			$affected = $result->affected();
			$result->free();
			return $affected;
		}

		public function query($query) {
			if (Logging::isDebug()) Logging::logDebug("DB: ".$query);
			
			$result = @pg_query($this->db, $query);
			if (!$result)
				throw new ServiceException("INVALID_CONFIGURATION", "Error executing query (".$query."): ".pg_last_error($this->db));
			return new Result($this->db, $result);
		}
		
		public function startTransaction() {
			$result = @pg_query($this->db, "START TRANSACTION;");
			if (!$result)
				throw new ServiceException("INVALID_CONFIGURATION", "Error starting transaction: ".pg_last_error($this->db));
		}

		public function commit() {
			$result = @pg_query($this->db, "COMMIT;");
			if (!$result)
				throw new ServiceException("INVALID_CONFIGURATION", "Error committing transaction: ".pg_last_error($this->db));
		}
		
		public function string($s, $quote = FALSE) {
			if ($s == NULL) return 'NULL';
			$r = pg_escape_string($this->db, $s);
			if ($quote) return "'".$r."'";
			return $r;
		}
		
		public function arrayString($a, $quote = FALSE) {
			$result = '';
			$first = TRUE;
			foreach($a as $s) {
				if (!$first) $result .= ',';
				if ($quote) $result .= "'".$s-"'";
				else $result .= $s;
				$first = FALSE;
			}
			return $result;
		}
		
		public function lastId() {
			return pg_last_oid($this->db);
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
			return pg_num_rows($this->result);
		}

		public function affected() {
			return pg_affected_rows($this->db);
		}
				
		public function rows() {
			$list = array();
			while ($row = pg_fetch_assoc($this->result)) {
				$list[] = $row;
			}
			pg_free_result($this->result);
			return $list;
		}
		
		public function firstRow() {
			$ret = pg_fetch_assoc($this->result);
			pg_free_result($this->result);
			return $ret;
		}
		
		public function value($i) {
			$ret = pg_result($this->result, $i);
			pg_free_result($this->result);
			return $ret;
		}
		
		public function free() {
			if ($this->result === TRUE or $this->result === FALSE) return;
			pg_free_result($this->result);
		}
	}
?>