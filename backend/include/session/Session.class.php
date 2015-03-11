<?php

/**
 * Session.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Session {
	const EVENT_TYPE_SESSION = "session";

	protected $useCookie;
	protected $id = NULL;
	protected $env;
	protected $dao;
	protected $session = array();
	protected $data = array();
	protected $user = NULL;
	protected $userGroups = NULL;

	public function __construct($useCookie) {
		$this->useCookie = $useCookie;
	}

	public function useCookie($u) {
		$this->useCookie($u);
	}

	public function initialize($env, $rq) {
		$this->env = $env;
		$this->dao = $this->getDao();

		if ($env != NULL and $env->events() != NULL) {
			require_once "include/event/SessionEvent.class.php";
			SessionEvent::register($env->events());
		}

		$id = NULL;
		$cookie = FALSE;
		$time = time();
		if ($rq != NULL) {
			$id = $rq->getSessionId();
		}

		// initialize guest mode
		if ($id === "guest" and $this->env->features()->isFeatureEnabled("guest_mode")) {
			$user = $this->env->settings()->setting("guest_user_id");
			if (!$user) {
				throw new ServiceException("INVALID_CONFIGURATION", "No guest user defined");
			}

			Logging::logDebug("Guest session: " . $user);
			$this->session = array("user_id" => $user);
		} else {
			$cookie = ($this->useCookie and $this->env->cookies()->exists("session"));
			if ($id == NULL and $cookie) {
				$id = $this->env->cookies()->get("session");
			}

			// no session found
			if ($id == NULL) {
				return;
			}

			$expiration = $this->getLastValidSessionTime($time);

			$sessionData = $this->dao->getSession($id, $this->env->configuration()->formatTimestampInternal($expiration));
			if ($sessionData == NULL) {
				$this->env->cookies()->remove("session");
				$this->removeAllExpiredSessions();
				return;
			}

			$this->session = $sessionData;
			$this->data = $this->dao->getSessionData($id);
		}
		$this->id = $id;

		// load user data
		if ($this->session["user_id"] != 0) {
			$this->user = $this->findSessionUser($this->session["user_id"]);
			if (!$this->user) {
				// user expired
				$this->end();
				$this->id = NULL;
				return;
			}
		} else {
			// anonymous session
			$this->user = array("id" => 0);
		}

		if ($this->isAuthenticated() and $this->env->features()->isFeatureEnabled('user_groups')) {
			$this->userGroups = $this->env->configuration()->getUsersGroups($this->user["id"]);
		}

		// extend session time
		$this->dao->updateSessionTime($this->id, $this->env->configuration()->formatTimestampInternal($time));

		// check if cookie is for same id
		if (!$cookie or strcmp($this->id, $this->env->cookies()->get("session")) != 0) {
			$this->setCookie($time);
		}
	}

	protected function findSessionUser($id) {
		return $this->env->configuration()->getUser($id, time());
	}

	protected function getDao() {
		require_once "SessionDao.class.php";
		return new SessionDao($this->env);
	}

	public function isAuthenticated() {
		return $this->user and ($this->user["id"] !== 0);
	}

	public function user() {
		if (!$this->isActive() or !$this->isAuthenticated()) {
			return NULL;
		}

		return $this->user;
	}

	public function username() {
		if (!$this->isActive() or !$this->isAuthenticated()) {
			return NULL;
		}

		return $this->user["name"];
	}

	public function userId() {
		if (!$this->isActive() or !$this->isAuthenticated()) {
			return NULL;
		}

		return $this->user["id"];
	}

	public function hasUserGroups() {
		if (!$this->isActive() or !$this->isAuthenticated()) {
			return FALSE;
		}

		return $this->userGroups != NULL and count($this->userGroups) > 0;
	}

	public function userGroups() {
		if (!$this->isActive() or !$this->isAuthenticated()) {
			return NULL;
		}

		return $this->userGroups;
	}

	private function getLastValidSessionTime($from = NULL) {
		$removed = $this->env->settings()->setting("session_time");
		if (!$from) {
			return time() - $removed;
		}

		return $from - $removed;
	}

	public function start($user, $data) {
		$this->id = uniqid(TRUE);
		$this->user = $user;
		if (!$this->user) {
			$this->user = array("id" => 0);
		}

		if ($this->user and $this->env->features()->isFeatureEnabled('user_groups')) {
			$this->userGroups = $this->env->configuration()->getUsersGroups($this->user["id"]);
		}

		$this->data = $data;

		$time = time();
		$this->dao->addSession($this->id, $this->user ? $this->user["id"] : "", $this->env->request()->ip(), $this->env->configuration()->formatTimestampInternal($time));
		if ($data and count($data) > 0) {
			$this->dao->addSessionData($this->id, $data);
		}

		$this->setCookie($time);
	}

	private function setCookie($from) {
		if (!$this->useCookie) {
			return;
		}

		// set session cookie last 10 years
		$this->env->cookies()->add("session", $this->id, $from + 60 * 60 * 24 * 30 * 12 * 10);
	}

	public function isActive() {
		return $this->id != NULL;
	}

	public function getSessionInfo() {
		$result = array();
		$result['session_id'] = $this->id;
		if ($this->isActive() and $this->isAuthenticated()) {
			$result['user_id'] = $this->userId();
			$result['username'] = $this->username();
			$result['user_type'] = $this->user["user_type"];
			$result['lang'] = $this->user["lang"];
			$result['user_auth'] = $this->user["auth"];
			if ($result['user_auth'] == NULL) {
				$result['user_auth'] = $this->env->authentication()->getDefaultAuthenticationMethod();
			}
		}

		return $result;
	}

	public function end() {
		if ($this->isActive()) {
			$this->dao->removeSession($this->id);
		}

		if ($this->useCookie and $this->env->cookies()->exists("session")) {
			$this->env->cookies()->remove("session");
		}

		$this->removeAllExpiredSessions();
	}

	public function removeAllExpiredSessions() {
		$expiration = $this->getLastValidSessionTime(time());
		$sessionData = $this->dao->removeAllSessionBefore($this->env->configuration()->formatTimestampInternal($expiration));
	}

	public function hasParam($param) {
		if (!$this->isActive()) {
			return FALSE;
		}

		return array_key_exists($param, $this->data);
	}

	public function param($param, $value = NULL) {
		if ($value === NULL) {
			return $this->data[$param];
		}

		$this->data[$param] = $value;
		if (!$this->isActive()) {
			// no session started, start anonymous session
			$this->start(NULL, array($param => $value));
		} else {
			$this->dao->addOrSetSessionData($this->id, $param, $value);
		}
	}

	public function log() {
		Logging::logDebug("SESSION: is_active=" . $this->isActive() . ", user=" . Util::array2str($this->user) . ", data=" . Util::array2str($this->data));
	}

	public function __toString() {
		return "Session";
	}
}

?>