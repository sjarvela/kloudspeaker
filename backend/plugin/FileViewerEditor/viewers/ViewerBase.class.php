<?php

	/**
	 * ViewerBase.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	abstract class ViewerBase {
		protected $env;
		protected $id;
		
		public function __construct($env, $id) {
			$this->env = $env;
			$this->id = $id;
		}
		
		protected function response() {
			return $this->env->response();
		}

		protected function request() {
			return $this->env->request();
		}

		protected function getDataUrl($item, $p, $fullUrl = TRUE) {
			return $this->env->getViewServiceUrl($item, array("data", $p), $fullUrl);
		}
				
		public function getServiceUrl($id, $path, $fullUrl = FALSE, $session = TRUE) {
			return $this->env->getServiceUrl($id, $path, $fullUrl, $session);
		}
		
		public function getContentUrl($item) {
			return $this->env->getContentUrl($item);
		}

		public function getResourceUrl() {
			return $this->env->getViewerResourceUrl($this->id);
		}
		
		public function getSettings() {
			return $this->env->getViewerSettings($this->id);
		}

		public function getItemContent($item) {
			return $this->env->getItemContent($item);
		}

		public function handleItemContent($item) {
			return FALSE;
		}
		
		protected function invalidRequestException($details = NULL) {
			return new ServiceException("INVALID_REQUEST", "Invalid ".get_class($this)." request: ".strtoupper($this->env->request()->method())." ".$this->env->request()->URI().($details != NULL ? (" ".$details): ""));
		}
	}
?>