<?php

	/**
	 * DefaultInstaller.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	require_once("install/MollifyInstallProcessor.class.php");
	
	class DefaultInstaller {
		private $page;
		private $processor;
		
		public function __construct($page) {
			$this->page = $page; 
			$this->processor = new MollifyInstallProcessor("install", NULL, array());
		}
		
		public function process() {
			$this->processor->showPage($this->page);
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
		
		public function action() {
			return $this->processor->action();
		}

	}
?>