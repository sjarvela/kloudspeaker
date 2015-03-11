<?php

	/**
	 * EventLogging.plugin.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	require_once("EventLogger.class.php");
	
	class EventLogging extends PluginBase {		
		public function hasAdminView() {
			return TRUE;
		}
		
		public function setup() {
			$logged = $this->getSetting("logged_events", NULL);
			if (!$logged or count($logged) == 0) $logged = array("*");
			
			$this->addService("eventlog", "EventLoggingServices");
			$this->env->features()->addFeature("event_logging");
			$e = new EventLogger($this->env);
			
			foreach($logged as $l)
				$this->env->events()->register($l, $e);
		}
		
		public function __toString() {
			return "EventLoggingPlugin";
		}
	}
?>