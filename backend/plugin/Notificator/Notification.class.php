<?php

	/**
	 * Notification.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	
	class Notification {
		private $id;
		private $name;
		private $title;
		private $msg;
		private $recipients;
		private $events;

		public function __construct($id, $name, $title, $msg, $recipients, $events) {
			$this->id = $id;
			$this->name = $name;
			$this->title = $title;
			$this->msg = $msg;
			$this->recipients = $recipients;
			$this->events = $events;
		}

		public function id() {
			return $this->id;
		}

		public function getName() {
			return $this->name;
		}

		public function getTitle() {
			return $this->title;
		}
		
		public function getMessage() {
			return $this->msg;
		}
		
		public function getRecipients() {
			return $this->recipients;
		}

		public function getEvents() {
			return $this->events;
		}
		
		public function __toString() {
			return "Notification [".$this->id."]";
		}
	}
?>