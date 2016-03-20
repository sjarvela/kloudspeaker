<?php

/**
 * SessionServices.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class SessionServices extends ServicesBase {
	private static $GET_ITEMS = array("info", "logout");
	private static $POST_ITEMS = array("authenticate", "logout");

	protected function isValidPath($method, $path) {
		if (count($path) < 1) {
			return FALSE;
		}

		if ($method === Request::METHOD_GET and !in_array($path[0], self::$GET_ITEMS)) {
			return FALSE;
		}

		if ($method === Request::METHOD_POST and !in_array($path[0], self::$POST_ITEMS)) {
			return FALSE;
		}

		if ($path[0] === 'info' and count($path) != 1) {
			return FALSE;
		}

		return TRUE;
	}

	protected function isAuthenticationRequired() {
		return FALSE;
	}

	public function processGet() {
		if ($this->path[0] === 'logout') {
			$this->env->events()->onEvent(SessionEvent::logout($this->env->request()->ip()));
			$this->env->session()->end();
			$this->response()->success($this->getSessionInfo());
			return;
		}
		$this->env->authentication()->check();
		$this->response()->success($this->getSessionInfo());
	}

	public function processPost() {
		if ($this->path[0] === 'logout') {
			$this->env->authentication()->logout();
			$this->env->events()->onEvent(SessionEvent::logout($this->env->request()->ip()));
			$this->env->session()->end();
			$this->response()->success($this->getSessionInfo());
			return;
		}

		$this->authenticate();
	}

	private function authenticate() {
		if (!$this->request->hasData("username") or !$this->request->hasData("password")) {
			throw new ServiceException("INVALID_REQUEST", "Missing parameters");
		}

		$pw = $this->request->data("password");
		$this->env->authentication()->login($this->request->data("username"), $pw);
		$this->env->events()->onEvent(SessionEvent::login($this->env->request()->ip()));

		$sessionInfo = $this->getSessionInfo();
		if ($this->request->hasData("remember") and strcmp($this->request->data("remember"), "1") === 0) {
			$this->env->authentication()->storeCookie();
		}

		$this->response()->success($sessionInfo);
	}

	private function getSessionInfo() {
		$auth = $this->env->authentication();
		$info = array(
			"authenticated" => $auth->isAuthenticated(),
			"features" => $this->env->features()->getFeatures(),
			"resources" => $this->env->resources()->getSessionInfo(),
			"plugins" => $this->env->plugins()->getSessionInfo(),
		);

		if ($auth->isAuthenticated()) {
			$info = array_merge(
				$info,
				$this->env->session()->getSessionInfo(),
				$this->env->filesystem()->getSessionInfo(),
				$this->env->permissions()->getSessionInfo()
			);
		}
		include_once "include/Version.info.php";
		global $VERSION, $REVISION;
		$info["version"] = $VERSION;
		$info["revision"] = $REVISION;
		return $info;
	}

	public function __toString() {
		return "SessionServices";
	}
}
?>