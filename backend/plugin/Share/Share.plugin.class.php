<?php

/**
 * Share.plugin.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

require_once "ShareHandler.class.php";

class Share extends PluginBase {
	private $handler;

	public function version() {
		return "1_3";
	}

	public function versionHistory() {
		return array("1_0", "1_1", "1_2", "1_3");
	}

	public function setup() {
		$this->addService("share", "ShareServices");
		$this->addService("public", "PublicShareServices");

		$this->handler = new ShareHandler($this->env, $this->getSettings());
		$this->env->events()->register("filesystem/", $this->handler);

		$this->env->permissions()->registerFilesystemPermission("share_item");

		$this->env->filesystem()->registerDataRequestPlugin(array("plugin-share-info"), $this->handler);
		$this->env->filesystem()->registerItemContextPlugin("plugin-share", $this->handler);
		$this->env->filesystem()->registerActionValidator("plugin-share", $this->handler);
	}

	public function registerHandler($type, $handler) {
		$this->handler->registerHandler($type, $handler);
	}

	public function deleteSharesForItem($itemId) {
		$this->handler->deleteSharesForItem($itemId);
	}

	public function getHandler() {
		return $this->handler;
	}

	public function __toString() {
		return "SharePlugin";
	}
}
?>
