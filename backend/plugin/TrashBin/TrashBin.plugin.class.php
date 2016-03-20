<?php

/**
 * TrashBin.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "TrashBinManager.class.php";
require_once "TrashBinFS.class.php";

class TrashBin extends PluginBase {
	private $trashManager;

	public function version() {
		if (!$this->hasSetting("folder")) return NULL;
		return "1_0";
	}

	public function versionHistory() {
		if (!$this->hasSetting("folder")) return NULL;
		return array("1_0");
	}

	public function setup() {
		if (!$this->hasSetting("folder")) return;

		TrashBinEvent::register($this->env->events());
		$this->trashBinManager = new TrashBinManager($this->env, $this->getSettings());

		$this->env->events()->register("session/login", $this->trashBinManager);

		$this->addService("trash", "TrashBinServices");
		$this->env->filesystem()->registerActionInterceptor("plugin-trashbin", $this->trashBinManager);
		$this->env->filesystem()->registerFilesystemId("trash", $this->trashBinManager);
	}

	public function getClientModuleId() {
		return "kloudspeaker/trashbin";
	}

	public function getTrashBinManager() {
		return $this->trashBinManager;
	}

	public function getSessionInfo() {
		$result = array("soft_delete" => $this->hasSetting("folder"));
		return $result;
	}

	public function __toString() {
		return "TrashBinPlugin";
	}
}

class TrashBinEvent extends MultiFileEvent {
	const EVENT_TYPE = 'trash';

	const TRASH = "trash";
	const RESTORE = "restore";

	static function register($eventHandler) {
		$eventHandler->registerEventType(TrashBinEvent::EVENT_TYPE, self::TRASH, "Items trashed");
		$eventHandler->registerEventType(TrashBinEvent::EVENT_TYPE, self::RESTORE, "Items restored");
	}

	static function trashed($items) {
		return new TrashBinEvent($items, self::EVENT_TYPE, self::TRASH);
	}

	static function restored($i) {
		return new TrashBinEvent(is_array($i) ? $i : array($i), self::EVENT_TYPE, self::RESTORE);
	}
}
?>
