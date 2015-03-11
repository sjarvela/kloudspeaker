<?php

	/**
	 * MollifyBackend.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	require_once("include/event/EventHandler.class.php");
	require_once("include/session/Session.class.php");
	require_once("include/ServiceEnvironment.class.php");
	require_once("include/Util.class.php");
	require_once("include/configuration/ConfigurationDao.class.php");
	require_once("include/configuration/UserEvent.class.php");

	class MollifyBackend {
		private $environment;
		
		function __construct($settings, $db, $responseHandler) {
			$this->settings = $settings;
			$this->session = new Session(TRUE);
			$this->configuration = new ConfigurationDao($db);
			$this->environment = new ServiceEnvironment($db, $this->session, $responseHandler, $this->configuration, $settings);
			$this->setup();
		}
	
		private function setup() {
			$this->environment->addService("authentication", "AuthenticationServices");
			$this->environment->addService("session", "SessionServices");
			$this->environment->addService("configuration", "ConfigurationServices");
			$this->environment->addService("filesystem", "FilesystemServices");
			$this->environment->addService("events", "EventServices");
			$this->environment->addService("permissions", "PermissionServices");
			if (Logging::isDebug()) {
				$this->environment->addService("debug", "DebugServices");
				$this->environment->response()->addListener($this);
			}
			
			UserEvent::register($this->environment->events());
			
			$this->environment->permissions()->registerPermission("change_password");
			
			$this->environment->plugins()->setup();
		}
		
		public function onResponseSent() {
			if (!$this->settings->hasSetting("debug_log") or !$this->environment->request()) return;
			$path = $this->environment->request()->path();
			if (count($path) > 0 and (strcasecmp($path[0], "debug") == 0)) return;
			
			$log = $this->settings->setting("debug_log");
			$handle = @fopen($log, "a");
			if (!$handle) {
				Logging::logError("Could not write to log file: ".$log);
				return;
			}
			
			$trace = Logging::getTrace();
			try {
				foreach($trace as $d)
					fwrite($handle, Util::toString($d));
				fclose($handle);
			} catch (Exception $e) {
				Logging::logError("Could not write to log file: ".$log);
				Logging::logException($e);
			}
		}
		
		public function env() {
			return $this->environment;
		}
		
		public function processRequest($request) {			
			$this->environment->initialize($request);
			$service = $this->environment->getService($request);

			if (!$service->isAuthenticated()) {
				$this->environment->session()->end();
				throw new ServiceException("UNAUTHORIZED");
			}
			
			$service->processRequest();
		}
		
		public function __toString() {
			return "MollifyBackend";
		}
	}
?>