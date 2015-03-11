<?php

	/**
	 * EditorBase.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	abstract class EditorBase {
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

		protected function getUrl($item, $p, $fullUrl = FALSE) {
			return $this->env->getEditServiceUrl($item, array($p), $fullUrl);
		}
				
		public function getServiceUrl($id, $path, $fullUrl = FALSE) {
			return $this->env->getServiceUrl($id, $path, $fullUrl);
		}
		
		public function getContentUrl($item) {
			return $this->env->getContentUrl($item);
		}

		public function getResourceUrl() {
			return $this->env->getEditorResourceUrl($this->id);
		}

		public function getCommonResourcesUrl() {
			return $this->env->getCommonResourcesUrl();
		}
		
		public function getSettings() {
			return $this->env->getEditorSettings($this->id);
		}
		
		protected function invalidRequestException($details = NULL) {
			return new ServiceException("INVALID_REQUEST", "Invalid ".get_class($this)." request: ".strtoupper($this->env->request()->method())." ".$this->env->request()->URI().($details != NULL ? (" ".$details): ""));
		}
	}
?>