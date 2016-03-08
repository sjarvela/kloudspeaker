<?php

/**
 * ServicesBase.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

abstract class ServicesBase {
	protected $env;
	protected $request;
	protected $id;
	protected $path;

	public function __construct($serviceEnvironment, $request, $id, $path) {
		$this->env = $serviceEnvironment;
		$this->request = $request;
		$this->id = $id;
		$this->path = $path;

		if (!$this->isValidPath($this->request->method(), $this->path)) {
			throw $this->invalidRequestException();
		}

		$this->init();
	}

	protected function init() {}

	public function isAuthenticated() {
		if ($this->isAuthenticationRequired() and !$this->env->authentication()->isAuthenticated()) {
			return FALSE;
		}

		if ($this->isAdminRequired() and !$this->env->authentication()->isAdmin()) {
			return FALSE;
		}

		return TRUE;
	}

	protected function isAuthenticationRequired() {
		return TRUE;
	}

	protected function isAdminRequired() {return FALSE;}

	protected function isValidPath($method, $path) {
		return FALSE;
	}

	public function response() {
		return $this->env->response();
	}

	public function processRequest() {
		switch ($this->request->method()) {
			case Request::METHOD_GET:
			case Request::METHOD_HEAD:
				$this->processGet();
				break;
			case Request::METHOD_PUT:
				$this->processPut();
				break;
			case Request::METHOD_POST:
				$this->processPost();
				break;
			case Request::METHOD_DELETE:
				$this->processDelete();
				break;
			default:
				throw new ServiceException("INVALID_REQUEST", "Unsupported method '" . $this->request->method() . "'");
		}
	}

	function processGet() {throw new ServiceException("INVALID_REQUEST", "Unimplemented method 'get'");}

	function processPut() {throw new ServiceException("INVALID_REQUEST", "Unimplemented method 'put'");}

	function processPost() {throw new ServiceException("INVALID_REQUEST", "Unimplemented method 'post'");}

	function processDelete() {throw new ServiceException("INVALID_REQUEST", "Unimplemented method 'delete'");}

	protected function item($i) {
		$id = $i;
		if (is_array($i) && array_key_exists("id", $i)) {
			$id = $i['id'];
		}

		return $this->env->filesystem()->item($id);
	}

	protected function items($a) {
		if (!is_array($a)) {
			return array($this->item($a));
		}

		$result = array();
		foreach ($a as $i) {
			$result[] = $this->item($i);
		}
		return $result;
	}

	protected function invalidRequestException($details = NULL) {
		return new ServiceException("INVALID_REQUEST", "Invalid " . get_class($this) . " request: " . strtoupper($this->request->method()) . " " . $this->request->URI() . ($details != NULL ? (" " . $details) : ""));
	}

	protected function error($code, $error="", $details = NULL) {
		Logging::logError("Request error: " . get_class($this) . " request: " . strtoupper($this->request->method()) . " " . $this->request->URI() . ($details != NULL ? (" " . $details) : ""));
		$this->env->response()->fail($code, $error, $details);
		die();
	}

	function log() {
		if (!Logging::isDebug()) {
			return;
		}

		Logging::logDebug("SERVICE (" . get_class($this) . ")");
	}
}
?>