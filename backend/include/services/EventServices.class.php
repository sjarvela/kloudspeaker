<?php

	/**
	 * EventServices.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class EventServices extends ServicesBase {
		protected function isValidPath($method, $path) {
			return count($path) == 1;
		}
				
		protected function isAdminRequired() { return TRUE; }
		
		public function processGet() {
			if ($this->path[0] === 'types') {
				$this->response()->success($this->env->events()->getTypes());
				return;
			}
			throw $this->invalidRequestException();
		}
		
		public function __toString() {
			return "EventServices";
		}
	}
?>