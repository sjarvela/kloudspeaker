<?php

/**
 * SessionEvent.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class SessionEvent extends Event {
	const LOGIN = "login";
	const LOGOUT = "logout";
	const FAILED_LOGIN = "failed_login";

	private $values = array();

	static function register($eventHandler) {
		$eventHandler->registerEventType(Session::EVENT_TYPE_SESSION, self::LOGIN, "Login");
		$eventHandler->registerEventType(Session::EVENT_TYPE_SESSION, self::LOGOUT, "Logout");
		$eventHandler->registerEventType(Session::EVENT_TYPE_SESSION, self::FAILED_LOGIN, "Failed login");
	}

	static function login($ip) {
		return new SessionEvent(self::LOGIN, array());
	}

	static function logout($ip) {
		return new SessionEvent(self::LOGOUT, array());
	}

	static function failedLogin($userId, $ip) {
		return new SessionEvent(self::FAILED_LOGIN, array("user" => $userId));
	}

	function __construct($type, $values) {
		parent::__construct(time(), Session::EVENT_TYPE_SESSION, $type);
		$this->values = $values;
	}

	public function itemToStr() {
		return '';
	}

	public function details() {
		$s = "";
		foreach ($this->values as $n => $v) {
			$s .= ($n . "=" . $v . ";");
		}

		return $s;
	}

	public function values($formatter) {
		return array_merge(parent::values($formatter), $this->values);
	}
}
?>
