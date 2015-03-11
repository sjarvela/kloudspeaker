<?php

/**
 * Authentication.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Authentication {
	const USER_TYPE_ADMIN = "a";

	protected $env;

	private $cachedDefaultPermission = FALSE;

	public function __construct($env) {
		$this->env = $env;
	}

	public function initialize() {
	}

	/*public function assertPermissionValue($value) {
	if ($value != self::PERMISSION_VALUE_ADMIN and $value != self::PERMISSION_VALUE_READWRITE and $value != self::PERMISSION_VALUE_READWRITE_NODELETE and $value != self::PERMISSION_VALUE_READONLY and $value != self::PERMISSION_VALUE_NO_RIGHTS)
	throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission mode [".$value."]");
	}*/

	public function check() {
		if ($this->isAuthenticated()) {
			if (!$this->env->session()->hasParam('auth') or strcasecmp("remote", $this->env->session()->param('auth')) != 0) {
				return;
			}

			if (isset($_SERVER["REMOTE_USER"]) and strcasecmp($this->env->session()->username(), $_SERVER["REMOTE_USER"]) == 0) {
				return;
			}

			// remote user has changed, end session
			$this->env->session()->end();
		}

		Logging::logDebug("No authenticated session active");
		$methods = $this->env->settings()->setting("authentication_methods");
		if (in_array("remote", $methods) and $this->checkRemoteAuth()) {
			return;
		}

		if ($this->checkStoredCookieAuth()) {
			return;
		}
	}

	private function checkRemoteAuth() {
		if (!isset($_SERVER["REMOTE_USER"])) {
			return FALSE;
		}

		$userName = $_SERVER["REMOTE_USER"];
		Logging::logDebug("Remote authentication found for [" . $userName . "] " . (isset($_SERVER["AUTH_TYPE"]) ? $_SERVER["AUTH_TYPE"] : ""));

		$user = $this->env->configuration()->getUserByName($userName);
		if ($user == NULL) {
			return FALSE;
		}

		Logging::logDebug("Remote authentication succeeded for [" . $user["id"] . "] " . $user["name"]);
		$this->setAuth($user, "remote");
		return true;
	}

	private function checkStoredCookieAuth() {
		if (!$this->env->cookies()->exists("login")) {
			return FALSE;
		}

		$data = $this->env->cookies()->get("login");
		Logging::logDebug("Stored login data " . $data);
		if (!$data or strlen($data) == 0) {
			return FALSE;
		}

		$parts = explode(":", $data);
		if (count($parts) != 2) {
			Logging::logDebug("Invalid auth cookie string: " . $data);
			return FALSE;
		}
		$userId = $parts[0];
		$token = $parts[1];

		$user = $this->env->configuration()->getUser($userId, time());

		if ($user == NULL) {
			Logging::logDebug("Auth cookie found, but user " . $userId . " does not exist or is expired");
			return FALSE;
		}

		$check = $this->getCookieAuthString($user);
		if (strcmp($token, $check) != 0) {
			Logging::logDebug("Login cookie found for user " . $userId . ", but auth key did not match");
			return FALSE;
		}
		Logging::logDebug("Stored authentication succeeded for user [" . $user["id"] . "] " . $user["name"]);
		$this->setAuth($user, "cookie");
	}

	private function getCookieAuthString($user) {
		$userAuth = $this->env->configuration()->getUserAuth($user["id"]);
		if (!$userAuth) {
			return "";
		}

		return md5($user["id"] . "/" . $user["name"] . "/" . $userAuth["hash"]);
	}

	public function storeCookie() {
		$user = $this->env->session()->user();
		$data = $user["id"] . ":" . $this->getCookieAuthString($user);
		$this->env->cookies()->add("login", $data, time() + 60 * 60 * 24 * 30);
	}

	public function login($username, $pw) {
		$user = $this->env->configuration()->findUser($username, $this->env->settings()->setting("email_login"), time());
		if (!$user) {
			syslog(LOG_NOTICE, "Failed Kloudspeaker login attempt from [" . $this->env->request()->ip() . "], user [" . $username . "]");
			$this->env->events()->onEvent(SessionEvent::failedLogin($username, $this->env->request()->ip()));
			throw new ServiceException("AUTHENTICATION_FAILED");
		}
		$auth = $this->env->configuration()->getUserAuth($user["id"]);
		if (!$this->auth($user, $auth, $pw)) {
			syslog(LOG_NOTICE, "Failed Kloudspeaker login attempt from [" . $this->env->request()->ip() . "], user [" . $username . "]");
			$this->env->events()->onEvent(SessionEvent::failedLogin($username, $this->env->request()->ip()));
			throw new ServiceException("AUTHENTICATION_FAILED");

		}
		$this->setAuth($user, $auth["type"]);
		return $user;
	}

	public function authenticate($userId, $pw) {
		return $this->auth($this->env->configuration()->getUser($userId), $this->env->configuration()->getUserAuth($userId), $pw);
	}

	private function auth($user, $auth, $pw) {
		if (!$user) {
			throw new ServiceException("INVALID_CONFIGURATION", "User info missing");
		}

		if (!$auth) {
			throw new ServiceException("INVALID_CONFIGURATION", "User auth info missing " . $user["id"]);
		}

		$authType = $auth["type"];
		if ($authType == NULL) {
			$authType = $this->getDefaultAuthenticationMethod();
		}

		if (strcasecmp($authType, "remote") === 0 and !isset($_SERVER["REMOTE_USER"])) {
			throw new ServiceException("AUTHENTICATION_FAILED");
		}

		$authModule = $this->getAuthenticationModule($authType);
		if (!$authModule) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid auth module: " . $auth);
		}

		return $authModule->authenticate($user, $pw, $auth);
	}

	private function getAuthenticationModule($id) {
		$setting = "auth_module_" . strtolower($id);
		if ($this->env->settings()->hasSetting($setting)) {
			$cls = $this->env->settings()->setting($setting);
		} else {
			$cls = "include/auth/Authenticator" . strtoupper($id) . ".class.php";
		}

		require_once $cls;
		$name = "Kloudspeaker_Authenticator_" . strtoupper($id);
		return new $name($this->env);
	}

	public function getDefaultAuthenticationMethod() {
		$m = $this->env->settings()->setting("authentication_methods");
		return $m[0];
	}

	public function setAuth($user, $authType = NULL) {
		$this->env->session()->start($user, array("auth" => $authType));
	}

	public function logout() {
		if (!$this->env->cookies()->exists("login")) {
			return;
		}

		$this->env->cookies()->remove("login");
	}

	public function realm() {
		return "kloudspeaker";
	}

	public function isAuthenticated() {
		return $this->env->session()->isActive() and ($this->env->session()->userId() != 0);
	}

	function assertAdmin() {
		if (!$this->isAdmin()) {
			throw new ServiceException("NOT_AN_ADMIN");
		}
	}

	function isAdmin() {
		if (!$this->isAuthenticated()) {
			return FALSE;
		}

		$user = $this->env->session()->user();
		return (strcasecmp($user["user_type"], self::USER_TYPE_ADMIN) === 0);
	}

	public function log() {
		Logging::logDebug("AUTH: is_authenticated=" . $this->isAuthenticated());
	}

	public function __toString() {
		return "Authentication";
	}
}

abstract class Kloudspeaker_Authenticator {
	abstract function authenticate($user, $pw, $auth);
}
?>