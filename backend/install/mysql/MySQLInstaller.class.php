<?php

/**
 * MySQLInstaller.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "install/kloudspeakerInstallProcessor.class.php";
require_once "include/ServiceEnvironment.class.php";
require_once "db/mysql/DatabaseUtil.class.php";
require_once "install/mysql/MySQLInstallUtil.class.php";
require_once "db/mysql/MySQLIDatabase.class.php";

class MySQLInstaller {
	protected $processor;
	private $settings;
	private $configured;
	protected $db;

	public function __construct($settings, $type = "install") {
		$this->settings = $settings;
		$this->processor = new kloudspeakerInstallProcessor($type, "mysql", $settings);
		$this->configured = isset($settings["db"]["user"], $settings["db"]["password"]);
	}

	public function processor() {
		return $this->processor;
	}

	public function onError($e) {
		$this->processor->onError($e);
	}

	public function util() {
		require_once "install/mysql/MySQLInstallUtil.class.php";
		return new MySQLInstallUtil($this->db);
	}

	public function isConfigured() {
		return $this->configured;
	}

	public function isInstalled() {
		if (!$this->isConfigured() or !$this->db) {
			return FALSE;
		}

		try {
			if (!$this->db->isConnected()) {
				mysqli_report(MYSQLI_REPORT_ALL);
				$this->db->connect(FALSE);
			}
		} catch (ServiceException $e) {
			return FALSE;
		}

		if (!$this->db->databaseExists()) {
			return FALSE;
		}

		try {
			$this->db->selectDb();
		} catch (ServiceException $e) {
			Logging::logDebug('kloudspeaker not installed');
			return FALSE;
		}

		try {
			$ver = $this->dbUtil->installedVersion();
		} catch (ServiceException $e) {
			Logging::logDebug('kloudspeaker not installed');
			return FALSE;
		}

		if ($ver != NULL) {
			Logging::logDebug('kloudspeaker installed version: ' . $ver);
		} else {
			Logging::logDebug('kloudspeaker not installed');
		}

		return $ver != NULL;
	}

	public function isCurrentVersionInstalled() {
		return ($this->installedVersion() === $this->currentVersion());
	}

	public function currentVersion() {
		return $this->dbUtil->currentVersion();
	}

	public function installedVersion() {
		return $this->dbUtil->installedVersion();
	}

	public function getVersionHistory() {
		return $this->dbUtil->getVersionHistory();
	}

	public function pluginInstalledVersion($id) {
		return $this->dbUtil->pluginInstalledVersion($id);
	}

	public function db() {
		return $this->db;
	}

	public function action() {
		return $this->processor->action();
	}

	public function hasError() {
		return $this->processor->hasError();
	}

	public function hasErrorDetails() {
		return $this->processor->hasErrorDetails();
	}

	public function error() {
		return $this->processor->error();
	}

	public function errorDetails() {
		return $this->processor->errorDetails();
	}

	public function data($name = NULL) {
		return $this->processor->data($name);
	}

	public function init() {
		$this->db = MySQLIDatabase::createFromConf($this->settings["db"]);
		$this->db->connect(FALSE);
		$this->dbUtil = new DatabaseUtil($this->db);
	}

	public function process() {
		$this->checkSystem();

		if (!$this->isConfigured()) {
			$this->processor->showPage("configuration");
		}

		try {
			$this->init();
		} catch (ServiceException $e) {
			$this->processor->setError("Could not connect to database", '<code>' . $e->details() . '</code>');
			$this->processor->showPage("configuration");
			die();
		}

		$this->checkInstalled();

		$phase = $this->processor->phase();
		if ($phase == NULL) {
			$phase = 'db';
		}

		Logging::logDebug("Installer phase: [" . $phase . "]");

		$this->onPhase($phase);
	}

	private function checkSystem() {
		if (!function_exists('mysql_connect')) {
			$this->processor->setError("MySQL not detected", "kloudspeaker cannot be installed to this system when MySQL is not available. Check your system configuration or choose different configuration type.");
			$this->processor->showPage("install_error");
		}

		if (!function_exists('mysqli_multi_query')) {
			$this->processor->setError("MySQL Improved (mysqli) not detected", "kloudspeaker installer cannot continue without <a href='http://www.php.net/manual/en/mysqli.overview.php' target='_blank'>MySQL Improved</a> installed. Either check your configuration to install or enable this, or install kloudspeaker manually (see instructions <a href='https://github.com/sjarvela/kloudspeaker/wiki/Installation' target='_blank'>here</a>).");
			$this->processor->showPage("install_error");
		}
	}

	private function checkInstalled() {
		if (!$this->isInstalled()) {
			return;
		}

		$this->processor->createEnvironment($this->db);
		if (!$this->processor->authentication()->isAdmin()) {
			die("kloudspeaker Installer requires administrator user");
		}

		$this->processor->showPage("installed");
	}

	private function onPhase($phase) {
		$this->processor->setPhase($phase);

		switch ($phase) {
			case 'db':
				$this->onPhaseDatabase();
				break;
			case 'admin':
				$this->onPhaseAdmin();
				break;
			case 'success':
				$this->processor->showPage("success");
				break;
			default:
				Logging::logError("Invalid installer phase: " . $phase);
				die();
		}
	}

	// PHASES

	private function onPhaseDatabase() {
		if ($this->processor->action() === 'continue_db') {
			$this->processor->clearAction();

			if (!$this->db->databaseExists()) {
				try {
					$this->dbUtil->createDatabase();
				} catch (ServiceException $e) {
					$this->processor->setError("Unable to create database", '<code>' . $e->details() . '</code>');
					$this->onPhase('db');
				}
			}

			$this->checkDatabasePermissions();
		}

		$this->processor->showPage("database");
	}

	private function checkDatabasePermissions() {
		try {
			$this->util()->checkPermissions();
		} catch (ServiceException $e) {
			$this->processor->setError("Insufficient database permissions", '<code>' . $e->details() . '</code>');
			$this->processor->onPhase('db');
		}
		$this->onPhase('admin');
	}

	private function onPhaseAdmin() {
		if ($this->processor->action() === 'install') {
			$this->install();
		}

		$this->processor->showPage("admin");
	}

	private function install() {
		try {
			$this->db->selectDb();
		} catch (ServiceException $e) {
			$this->processor->setError("Could not select database", '<code>' . $e->details() . '</code>');
			$this->processor->showPage("install_error");
		}

		$this->db->startTransaction();

		try {
			$this->util()->execCreateTables();
			$this->util()->execInsertParams();
		} catch (ServiceException $e) {
			$this->processor->setError("Could not install", '<code>' . $e->details() . '</code>');
			$this->processor->showPage("install_error");
		}

		$this->processor->createEnvironment($this->db);
		try {
			$this->processor->installPlugins($this->util());
		} catch (ServiceException $e) {
			$this->processor->setError("Could not install plugins", '<code>' . $e->details() . '</code>');
			$this->processor->showPage("install_error");
		}

		try {
			$this->processor->createAdminUser($this->data("name"), $this->data("password"));
		} catch (ServiceException $e) {
			$this->processor->setError("Could not create admin user", '<code>' . $e->details() . '</code>');
			$this->processor->showPage("install_error");
		}

		try {
			$this->db->commit();
		} catch (ServiceException $e) {
			$this->processor->setError("Could not install", '<code>' . $e->details() . '</code>');
			$this->processor->showPage("install_error");
		}

		$this->onPhase('success');
	}
}
?>