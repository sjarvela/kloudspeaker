<?php
require_once "vendor/phpass/PasswordHash.php";
/**
 * PasswordHash.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class kloudspeaker_PasswordHash {
	private static $hash_cost_log2 = 8;
	private static $hash_portable = FALSE;

	private $serverSalt;

	public function __construct($settings) {
		$this->serverSalt = $settings->setting("server_hash_salt");
		$devurandom = ($settings->setting("no_dev_urandom") or $settings->setting("no_udev_random"));
		$this->hasher = new PasswordHash(self::$hash_cost_log2, self::$hash_portable, $devurandom);
	}

	public function createHash($pw, $saltPrefix = '') {
		$salt = uniqid($saltPrefix, TRUE);
		$hash = $this->hasher->HashPassword($this->serverSalt . $pw . $salt);
		if (strlen($hash) < 20) {
			throw new ServiceException("REQUEST_FAILED");
		}

		return array("salt" => $salt, "hash" => $hash);
	}

	public function isEqual($pw, $hash, $salt) {
		$ret = $this->hasher->CheckPassword($this->serverSalt . $pw . $salt, $hash);
		return ($ret === TRUE or $ret == 1);
	}
}
?>