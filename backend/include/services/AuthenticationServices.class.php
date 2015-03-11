<?php

	/**
	 * AuthenticationServices.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class AuthenticationServices extends ServicesBase {
		protected function isValidPath($method, $path) {
			return ($method == Request::METHOD_GET and count($path) == 0);
		}
		
		public function processGet() {
			$this->env->authentication()->check();
			$state = ($this->env->authentication()->isAuthenticated());
			$this->response()->success($state);
		}
		
		public function __toString() {
			return "AuthenticationServices";
		}
	}
?>