<?php
	/**
	 * AuthenticatorPW.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class Kloudspeaker_Authenticator_PW extends Kloudspeaker_Authenticator {
		private $env;
		
		public function __construct($env) {
			$this->env = $env;
		}
		
		public function authenticate($user, $pw, $auth) {
			return ($this->env->passwordHash()->isEqual($pw, $auth["hash"], $auth["salt"]));
		}
	}
?>