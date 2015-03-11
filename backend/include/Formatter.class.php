<?php

	/**
	 * Formatter.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class Formatter {
		private $env;
		 
		public function __construct($env) {
			$this->env = $env;
		}
		
		public function formatDateTime($t) {
			return date($this->env->settings()->setting("datetime_format"), $t);
		}
		
		public function getServiceUrl($s, $p) {
			return $this->env->getServiceUrl($s, $p, TRUE);
		}
		
		public function getClientUrl($p) {
			return $this->env->getClientUrl($p);
		}
	}
?>