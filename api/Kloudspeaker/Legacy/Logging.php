<?php

/**
 * Legacy.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Logging {
	private static $debug = FALSE;
	private static $logger = NULL;
	private static $trace = array();

	static function initialize($logger, $debug = FALSE) {
		self::$logger = $logger;
		self::$debug = $debug;
	}

	public static function isDebug() {
		return self::$debug;
	}
	
	public static function getTrace() {
		return self::$trace;
	}

	public static function debug($m) {
		self::logDebug($m);
	}
	
	public static function logDebug($m) {
		if (self::$logger != NULL) {
			self::$logger->debug($m);
			return;
		}
		if (!self::isDebug()) return;

		$s = self::toStr($m);
		error_log("KLOUDSPEAKER DEBUG: ".$s);
		if (self::$firebug) FB::log($m);
		self::$trace[] = $s;
	}

	public static function info($m) {
		self::logInfo($m);
	}
	
	public static function logInfo($m) {
		if (self::$logger != NULL) {
			self::$logger->info($m);
			return;
		}

		$s = self::toStr($m);
		error_log("KLOUDSPEAKER INFO: ".$s);

		if (self::isDebug()) self::$trace[] = $s;
	}

	public static function error($m) {
		self::logError($m);
	}
	
	public static function logError($m) {
		if (self::$logger != NULL) {
			self::$logger->error($m);
			return;
		}

		$s = self::toStr($m);
		error_log("KLOUDSPEAKER ERROR: ".$s);
		
		if (self::isDebug()) self::$trace[] = $s;
	}

	public static function ex($e) {
		self::logException($e);
	}

	public static function logException($e) {
		$c = get_class($e);
		if ($c === "ServiceException") {
			$t = $e->type();
			if (is_array($t)) $t = Util::array2str($t);
			$msg = "ServiceException: ".$t."=".$e->details();
		} else {
			$msg = "Exception (".$c."): ".$e->getMessage();
		}
		if (self::$logger != NULL) {
			self::$logger->error($m);
			return;
		}
		self::logError($msg);
		self::logError($e->getTrace());
	}
}