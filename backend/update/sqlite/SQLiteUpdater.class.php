<?php

	/**
	 * SQLiteUpdater.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	
	require_once("install/sqlite/SQLiteInstaller.class.php");

	class SQLiteUpdater extends SQLiteInstaller {

		public function __construct($settings) {
			parent::__construct($settings, "update");
		}
				
		public function updateVersionStep($from, $to) {
			$this->util()->updateVersionStep($from, $to);
		}
		
		public function getConversion($versionTo) {
			if (strcmp("1_8_5", $versionTo) === 0) {
				require_once("update/conversion/1_8_5.php");
				return new Upd_1_8_5();
			}
			return NULL;
		}
		
		public function process() {}
		
		public function __toString() {
			return "SQLiteUpdater";
		}	
	}
?>