<?php

	/**
	 * DBConnectionFactory.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	 
	class DBConnectionFactory {
		public function createConnection($settings) {
			if (!$settings->hasSetting("db")) throw new ServiceException("INVALID_CONFIGURATION", "No database settings defined");
			$db = $settings->setting("db");
			
			if (!isset($db["type"])) throw new ServiceException("INVALID_CONFIGURATION", "No database type defined");
			$type = $db["type"];
			
			if (strcasecmp($type, 'pdo') == 0) {
				require_once("db/pdo/PDODatabase.class.php");
				return PDODatabase::createFromConf($db);
			} else if (strcasecmp($type, 'mysql') == 0) {
				require_once("db/mysql/MySQLIDatabase.class.php");
				return MySQLIDatabase::createFromConf($db);
			} else if (strcasecmp($type, 'postgresql') == 0) {
				require_once("db/postgresql/PostgresqlDatabase.class.php");
				return PostgresqlDatabase::createFromConf($db);
			} else if (strcasecmp($type, 'sqlite3') == 0) {
				require_once("db/sqlite/SQLite3Database.class.php");
				return MollifySQLite3Database::createFromConf($db);
			} else if (strcasecmp($type, 'sqlite') == 0) {
				require_once("db/sqlite/SQLiteDatabase.class.php");
				return MollifySQLiteDatabase::createFromConf($db);
			} else {
				throw new ServiceException("INVALID_CONFIGURATION", "Unsupported database type: [".$type."]");
			}
		}
		
		public function __toString() {
			return "DBConnectionFactory";
		}
	}
?>