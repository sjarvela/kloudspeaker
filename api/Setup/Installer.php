<?php

namespace Kloudspeaker\Setup;

class Installer {
	public function __construct($c) {
		$this->container = $c;
		$this->logger = $c->logger;
	}

	public function initialize() {
		$this->container->commands->register('install', [$this, 'cmdInstall']);
	}

	public function cmdInstall($opts) {
		$result = [
			"database_configuration" => FALSE,
			"database_connection" => FALSE,
			"database_version" => NULL
		];
		$this->logger->info("Running installer");

		$this->logger->info("Checking database configuration...");
		if (!$this->isDatabaseConfigured()) {
			$this->logger->error("Database not configured");
			return $result;
		}
		$result["database_configuration"] = TRUE;

		$this->logger->info("Checking database connection...");
		$conn = $this->container->dbfactory->checkConnection();
		if (!$conn["connection"]) {
		    $this->logger->error("Cannot connect to database: ".$conn["reason"]);
		    $result["database_connection_error"] = $conn["reason"];
		    return $result;
		}
		$result["database_connection"] = TRUE;

		$db = $this->container->db;

		$this->logger->info("Checking database tables...");
		if ($db->tableExists("parameter")) {
			$this->logger->info("Old installation exists, checking database version");

			try {
				$installedVersion = $db->select('parameter', ['name', 'value'])->where('name', 'database')->done()->execute()->firstValue('value');

				if (!$installedVersion or $installedVersion == NULL) {
					$this->logger->info("No database version found");
					return array_merge($result, $this->migrate());
				}

				$this->logger->info("Installed version: $installedVersion");

				$result["database_version"] = $installedVersion;
				return array_merge($result, $this->update());
			} catch (Exception $e) {
				$this->logger->info("Unable to resolve installed version: ".$e->getMessage());
				return $result;
			}
		}

		return array_merge($result, $this->install());
	}

	private function install() {

	}

	private function update() {

	}

	private function migrate() {
		$db = $this->container->db;

		$fromVersion = $db->select('parameter', ['name', 'value'])->where('name', 'version')->done()->execute()->firstValue('value');

		if (!$fromVersion or $fromVersion == NULL) {
			$this->logger->info("No migration version found");
			return FALSE;
		}

		$this->logger->info("Migrating from version: $fromVersion");
		if ($fromVersion != "2_7_28") {
			$this->logger->info("Cannot migrate from this version, update to last 2.x version");
			return FALSE;
		}

		//TODO run migration job

		return TRUE;
	}

	public function isDatabaseConfigured() {
		$c = $this->container->configuration;
		if (!$c->has("db")) return FALSE;
		$dbc = $c->get("db");
		if (!array_key_exists("dsn", $dbc)) return FALSE;
		if (!array_key_exists("user", $dbc)) return FALSE;
		if (!array_key_exists("password", $dbc)) return FALSE;
		return TRUE;
	}
}