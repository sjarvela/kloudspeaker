<?php
namespace Kloudspeaker\Auth;

require_once "vendor/static/phpass/PasswordHash.php";

/**
 * PasswordHash.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class PasswordHash {
	private static $hash_cost_log2 = 8;
	private static $hash_portable = FALSE;

	private $serverSalt;

	public function __construct($hashSalt, $noDevUrandom) {
		$this->serverSalt = $hashSalt;
		$this->hasher = new \PasswordHash(self::$hash_cost_log2, self::$hash_portable, $noDevUrandom);
	}

	public function createHash($pw, $saltPrefix = '') {
		$salt = uniqid($saltPrefix, TRUE);
		$hash = $this->hasher->HashPassword($this->serverSalt . $pw . $salt);
		if (strlen($hash) < 20) {
			throw new \KloudspeakerException("Hash failed");
		}

		return array("salt" => $salt, "hash" => $hash);
	}

	public function isEqual($pw, $hash, $salt) {
		$ret = $this->hasher->CheckPassword($this->serverSalt . $pw . $salt, $hash);
		return ($ret === TRUE or $ret == 1);
	}
}
?>