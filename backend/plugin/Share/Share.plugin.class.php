<?php

/**
 * Share.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "ShareHandler.class.php";

class Share extends PluginBase {
	private $handler;

	public function version() {
		return "1_5";
	}

	public function versionHistory() {
		return array("1_0", "1_1", "1_2", "1_3", "1_4", "1_5");
	}

	public function setup() {
		$this->addService("share", "ShareServices");
		$this->addService("public", "PublicShareServices");

		$this->handler = new ShareHandler($this->env, $this->getSettings());
		$this->env->events()->register("filesystem/", $this->handler);

		$this->env->permissions()->registerFilesystemPermission("share_item");

		$this->env->filesystem()->registerDataRequestPlugin(array("plugin-share/item-info"), $this->handler);
		$this->env->filesystem()->registerItemContextPlugin("plugin-share", $this->handler);
		$this->env->filesystem()->registerActionValidator("plugin-share", $this->handler);
	}

	public function getClientModuleId() {
		return "kloudspeaker/share";
	}

	public function registerHandler($type, $handler) {
		$this->handler->registerHandler($type, $handler);
	}

	public function deleteSharesForItem($item) {
		$this->handler->deleteSharesForItem($item);
	}

	public function deleteUserSharesForItem($item, $userId = NULL) {
		$this->handler->deleteUserSharesForItemId($item, $userId);
	}

	public function getHandler() {
		return $this->handler;
	}

	public function __toString() {
		return "SharePlugin";
	}
}
?>
