<?php

/**
 * Registration.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Registration extends PluginBase {
	public function setup() {

		$this->addService("registration", "RegistrationServices");
		$this->env->features()->addFeature("registration");
		RegistrationEvent::register($this->env->events());
		$this->env->permissions()->registerPermission("manage_user_registrations");
	}

	public function version() {
		return "1_2";
	}

	public function versionHistory() {
		return array("1_0", "1_1", "1_2");
	}

	public function getSessionInfo() {
		return array("require_approval" => $this->getSetting("require_approval", TRUE));
	}

	public function getClientModuleId() {
		return "kloudspeaker/registration";
	}

	public function __toString() {
		return "RegistrationPlugin";
	}
}

class RegistrationEvent extends Event {
	const EVENT_TYPE = 'registration';

	const REGISTER = "register";
	const CONFIRM = "confirm";
	const USER_CREATED = "user_created";
	const USER_FOLDER_CREATED = "user_folder_created";

	static function register($eventHandler) {
		$eventHandler->registerEventType(RegistrationEvent::EVENT_TYPE, self::REGISTER, "User registered");
		$eventHandler->registerEventType(RegistrationEvent::EVENT_TYPE, self::CONFIRM, "User registration confirmed");
		$eventHandler->registerEventType(RegistrationEvent::EVENT_TYPE, self::USER_CREATED, "Registered user created");
		$eventHandler->registerEventType(RegistrationEvent::EVENT_TYPE, self::USER_FOLDER_CREATED, "Registered user folder created");
	}

	static function registered($name, $email, $id, $key) {
		return new RegistrationEvent(self::REGISTER, NULL, $name, $email, $id, $key);
	}

	static function confirmed($name, $email, $id) {
		return new RegistrationEvent(self::CONFIRM, NULL, $name, $email, $id);
	}

	static function userCreated($id, $name, $email) {
		return new RegistrationEvent(self::USER_CREATED, $id, $name, $email);
	}

	static function userFolderCreated($userId, $username, $email, $registrationId, $userFolder) {
		return new RegistrationEvent(self::USER_FOLDER_CREATED, $userId, $username, $email, $registrationId, FALSE, $userFolder);
	}

	private $registrationId;
	private $registrationKey;
	private $data;

	function __construct($type, $userId, $username, $email = FALSE, $registrationId = FALSE, $registrationKey = FALSE, $data = NULL) {
		parent::__construct(time(), RegistrationEvent::EVENT_TYPE, $type);
		$this->user = array("id" => $userId, "name" => $username);
		$this->email = $email;
		if ($email) {
			$this->user["email"] = $email;
		}

		$this->registrationId = $registrationId;
		$this->registrationKey = $registrationKey;

		$this->data = $data;
	}

	public function setUser($user) {}

	public function details() {
		$d = "";
		if ($this->email) {
			$d .= "email=" . $this->email . ';';
		}

		if ($this->subType() == self::REGISTER) {
			$d .= "registration_id=" . $this->registrationId . ';' . "registration_key=" . $this->registrationKey . ';';
		}

		if ($this->subType() == self::CONFIRM) {
			$d .= "registration_id=" . $this->registrationId . ';';
		}

		if ($this->subType() == self::USER_FOLDER_CREATED) {
			$d .= "user_folder_id=" . $this->data->id() . ";";
		}
		return $d;
	}

	public function values($formatter) {
		$values = parent::values($formatter);
		if ($this->subType() == self::REGISTER) {
			$values["registration_id"] = $this->registrationId;
			$values["registration_key"] = $this->registrationKey;
			$values["registration_approve_link"] = $formatter->getClientUrl("?v=registration/approve&id=" . $this->registrationId);
		} else if ($this->subType() == self::CONFIRM) {
			$values["registration_id"] = $this->registrationId;
			$values["registration_approve_link"] = $formatter->getClientUrl("?v=registration/approve&id=" . $this->registrationId);
		} else if ($this->subType() == self::USER_FOLDER_CREATED) {
			$values["user_folder_id"] = $this->data->id();
		}
		return $values;
	}

	public function data() {
		return $this->data;
	}
}
?>