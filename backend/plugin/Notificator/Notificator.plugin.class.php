<?php

	/**
	 * Notificator.plugin.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	
	class Notificator extends PluginBase {

		public function version() {
			return "1_1";
		}

		public function versionHistory() {
			return array("1_0", "1_1");
		}				

		public function setup() {
			$this->addService("notificator", "NotificatorServices");
			
			require_once("NotificatorHandler.class.php");
			$this->env->events()->register("*", new NotificatorHandler($this->env));
		}

		public function getClientModuleId() {
			return "kloudspeaker/notificator";
		}

		public function __toString() {
			return "NotificatorPlugin";
		}
	}
?>