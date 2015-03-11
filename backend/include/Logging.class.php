<?php

	/**
	 * Logging.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	 
	include_once("Util.class.php");
	
	class Logging {
		private static $version = "";
		private static $debug = FALSE;
		private static $firebug = FALSE;
		private static $trace = array();
	
		static function initialize($settings, $version = "-") {
			self::$version = $version;
			self::$debug = (isset($settings) and isset($settings["debug"]) and $settings['debug'] === TRUE);
			self::$firebug = (isset($settings) and isset($settings["firebug_logging"]) and $settings['firebug_logging'] === TRUE);

			if (self::$firebug) {
				require_once('FirePHPCore/fb.php');
				FB::setEnabled(true);
			}
		}
		
		public static function isDebug() {
			return self::$debug;
		}
		
		public static function getTrace() {
			return self::$trace;
		}
		
		public static function logDebug($m) {
			if (!self::isDebug()) return;

			$s = self::toStr($m);
			error_log("KLOUDSPEAKER DEBUG: ".$s);
			if (self::$firebug) FB::log($m);
			self::$trace[] = $s;
		}
		
		public static function logInfo($m) {
			$s = self::toStr($m);
			error_log("KLOUDSPEAKER INFO: ".$s);

			if (self::$firebug) FB::log($m);
			if (self::isDebug()) self::$trace[] = $s;
		}
		
		public static function logError($m) {
			$s = self::toStr($m);
			error_log("KLOUDSPEAKER ERROR: ".$s);
			
			if (self::$firebug) FB::error($m);
			if (self::isDebug()) self::$trace[] = $s;
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
			self::logError($msg);
			self::logError($e->getTrace());
		}
				
		public static function logSystem() {
			if (!self::isDebug()) return;
			self::logDebug("VERSION: ".self::$version." SERVER: ".Util::array2str($_SERVER, array("HTTP_USER_AGENT", "HTTP_ACCEPT", "HTTP_HOST", "HTTP_ACCEPT_LANGUAGE", "HTTP_ACCEPT_ENCODING", "HTTP_ACCEPT_CHARSET", "HTTP_KEEP_ALIVE", "HTTP_CONNECTION", "PATH", "SERVER_SIGNATURE", "SERVER_SOFTWARE", "SERVER_NAME", "SERVER_ADDR", "SERVER_PORT", "REMOTE_ADDR", "DOCUMENT_ROOT", "SERVER_ADMIN", "REMOTE_PORT", "GATEWAY_INTERFACE", "FILES")));
		}
		
		private static function toStr($o) {
			if (is_array($o)) return Util::array2str($o);
			return (string) $o;
		}
	}
?>