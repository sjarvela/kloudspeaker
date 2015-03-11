<?php

	/**
	 * PDOUpdater.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	
	require_once("install/pdo/PDOInstaller.class.php");
	
	class PDOUpdater extends PDOInstaller {
		
		public function __construct($settings) {
			parent::__construct($settings, "update");
		}
				
		public function updateVersionStep($from, $to) {
			$this->util()->updateVersionStep($from, $to);
		}
		
		public function getConversion($versionTo) {
			return NULL;
		}
		
		public function process() {}
				
		public function __toString() {
			return "PDOUpdater";
		}
	}
?>