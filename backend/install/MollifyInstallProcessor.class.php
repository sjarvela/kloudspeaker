<?php

/**
 * kloudspeakerInstallProcessor.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class kloudspeakerInstallProcessor {
	protected $type;
	protected $pageRoot;
	private $settingsVar;

	private $db;
	private $settings;
	private $session;
	private $authentication;
	private $configuration;
	private $plugins;
	private $features;
	private $cookies;
	private $resources;

	private $error = NULL;
	private $errorDetails = NULL;
	private $data = array();

	public function __construct($pageRoot, $type, $settingsVar) {
		$this->pageRoot = $pageRoot;
		$this->type = $type;
		$this->settingsVar = $settingsVar;
		foreach ($_POST as $key => $val) {
			$this->data[$key] = $val;
		}

		require_once "include/Logging.class.php";
		Logging::initialize($this->settingsVar);
		Logging::logDebug("Installer: " . get_class($this));
	}

	public function createEnvironment($db) {
		require_once "include/Settings.class.php";
		require_once "include/Features.class.php";
		require_once "include/Util.class.php";

		require_once "include/session/Session.class.php";
		require_once "install/InstallerSession.class.php";
		require_once "include/event/EventHandler.class.php";
		require_once "InstallerAuthentication.class.php";
		require_once "include/configuration/ConfigurationDao.class.php";
		require_once "plugin/PluginController.class.php";
		require_once "include/auth/PasswordHash.class.php";
		require_once "include/ResourceLoader.class.php";

		$this->db = $db;
		$this->settings = new Settings($this->settingsVar);
		$this->session = new InstallerSession(FALSE);
		$this->authentication = new InstallerAuthentication($this);
		$this->plugins = new PluginController($this);
		$this->configuration = new ConfigurationDao($this->db);
		$this->configuration->initialize($this);
		$this->features = new Features($this->settings);
		$this->cookies = new Cookie($this->settings);
		$this->passwordHash = new kloudspeaker_PasswordHash($this->settings);
		$this->resources = new ResourceLoader($this);

		$this->plugins->setup();
		$this->session->initialize($this, NULL);
	}

	private function getDB($settings) {
		require_once "db/DBConnectionFactory.class.php";
		$f = new DBConnectionFactory();
		return $f->createConnection($settings);
	}

	public function registerFilesystem($id, $fs) {}

	public function registerDataRequestPlugin($p) {}

	public function registerItemContextPlugin($p) {}

	public function registerActionValidator($p) {}

	public function registerActionInterceptor($p) {}

	public function registerItemCleanupHandler($p) {}

	public function registerPermission($p, $v) {}

	public function onError($e) {
		Logging::logException($e);
	}

	public function db() {
		return $this->db;
	}

	public function settings() {
		return $this->settings;
	}

	public function cookies() {
		return $this->cookies;
	}

	public function session() {
		return $this->session;
	}

	public function authentication() {
		return $this->authentication;
	}

	public function configuration() {
		return $this->configuration;
	}

	public function events() {
		return $this;
	}

	public function resources() {
		return $this->resources;
	}

	public function features() {
		return $this->features;
	}

	public function plugins() {
		return $this->plugins;
	}

	public function filesystem() {
		return $this;
	}

	public function permissions() {
		return $this;
	}

	public function passwordHash() {
		return $this->passwordHash;
	}

	public function hasError() {
		return $this->error != NULL;
	}

	public function hasErrorDetails() {
		return $this->errorDetails != NULL;
	}

	public function error() {
		return $this->error;
	}

	public function errorDetails() {
		return $this->errorDetails;
	}

	public function setError($title, $details = NULL) {
		$this->error = $title;
		$this->errorDetails = $details;
	}

	public function action() {
		return $this->data("action");
	}

	public function clearAction() {
		unset($this->data["action"]);
	}

	public function phase() {
		return $this->data("phase");
	}

	public function setPhase($val) {
		Logging::logDebug("New installer phase: [" . $val . "]");
		$this->data['phase'] = $val;
	}

	public function data($name = NULL) {
		if ($name == NULL) {
			return $this->data;
		}

		return isset($this->data[$name]) ? $this->data[$name] : NULL;
	}

	public function setData($name, $value) {
		$this->data[$name] = $value;
	}

	protected function getPagePath($page) {
		$path = ($this->pageRoot) ? $this->pageRoot . "/" : "";
		$path = $path . (($this->type) ? $this->type . "/" : "");
		return $path . "page_" . $page . ".php";
	}

	public function getScriptRootPath() {
		// get root folder (parent for installer)
		return dirname(dirname($_SERVER['SCRIPT_FILENAME'])) . DIRECTORY_SEPARATOR;
	}

	public function showPage($page) {
		$page = $this->getPagePath($page);
		Logging::logDebug("Opening page: " . $page . " " . ($this->hasError() ? "(error=" . $this->error . ")" : ""));
		require $page;
		die();
	}

	public function addFeature($f) {}

	public function addService($p, $s) {}

	public function registerEventType($e, $d) {}

	public function register($e, $d) {}

	public function registerObject($e, $d) {}

	public function registerDetailsPlugin($p) {}

	public function registerFilesystemPermission($p, $v = NULL) {}

	public function registerSearcher($s) {}

	public function installPlugins($util) {
		$allPlugins = $this->plugins()->getPlugins();
		$customPath = $this->resources()->getCustomizationsPath();
		$settings = $this->settings()->setting("plugins");

		foreach ($allPlugins as $id => $p) {
			if ($p->version() == NULL) {
				continue;
			}
			$ps = $settings[$id];
			$custom = (isset($ps["custom"]) and $ps["custom"] == TRUE);

			$util->execPluginCreateTables($id, ($custom ? $customPath : NULL));
		}
	}

	public function createAdminUser($name, $pw) {
		$id = $this->configuration()->addUser($name, NULL, NULL, Authentication::USER_TYPE_ADMIN, NULL);
		$this->configuration()->storeUserAuth($id, $name, NULL, $pw, TRUE);
	}

	public function __toString() {
		return "kloudspeakerInstaller";
	}
}
?>
