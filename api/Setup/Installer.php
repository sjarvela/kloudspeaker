<?php

namespace Kloudspeaker\Setup;

class Installer {
	public function __construct($c) {
		$this->container = $c;
	}

	public function initialize() {
		$this->container->commands->register('install', [$this, 'doInstall']);
	}

	public function doInstall($opts, $out) {
		$out("INSTALLER");

		$out("Checking database configuration...");
		if (!$this->isDatabaseConfigured()) {
			$out("ERROR: Database not configured");
			return;
		}

		$out("Checking database connection...");
		$dbc = $this->container->configuration->get("db");
		try {
		    $this->pdo = new \PDO($dbc['dsn'], $dbc['user'], $dbc['password'], array(\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION));
		} catch (Exception $e) {
		    $out("Cannot connect to database: ".$e->getMessage());
		    return;
		}

		$db = $this->container->db;

		$out("Checking database tables...");
		if ($db->tableExists("parameter")) {
			$out("Old installation exists, checking version");

			try {
				$installedVersion = $db->select('parameter', ['name', 'value'])->where('name', 'database')->done()->execute()->firstValue('value');
				$out("Installed version: $installedVersion");

				//check installed version -> update?
			} catch (Exception $e) {
				$out("Unable to resolve installed version: ".$e->getMessage());
				return;
			}
		} else {
			//clean install
		}
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