<?php

	/**
	 * EventLogger.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class EventLogger {
		private $env;
		
		public function __construct($env) {
			$this->env = $env;
		}
		
		public function onEvent($e) {
			$time = date('YmdHis', $e->time());
			
			$item = $e->itemToStr();
			if (strlen($item) > 512) $item = substr($item, 0, 512);	//TODO
			
			$details = $e->details();
			$type = $e->typeId();
			$username = $this->getUser($e);
						
			$db = $this->env->db();
			$db->update(sprintf("INSERT INTO ".$db->table("event_log")." (time, user, ip, type, item, details) VALUES (%s, %s, %s, '%s', %s, %s)", $time, $db->string($username, TRUE), $db->string($e->ip(), TRUE), $db->string($type), $db->string($item, TRUE), $db->string($details, TRUE)));
		}
		
		private function getUser($e) {
			$user = $e->user();
			if (!$user) return NULL;
			return $user["name"];
		}
		
		public function __toString() {
			return "EventLogger";
		}
	}
?>