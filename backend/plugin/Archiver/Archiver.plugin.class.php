<?php

/**
 * Archiver.plugin.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

require_once "ArchiveManager.class.php";

class Archiver extends PluginBase {
	public function setup() {
		$this->addService("archiver", "ArchiverServices");
		$this->env->filesystem()->registerItemContextPlugin("plugin-archiver", $this);

		$compressor = $this->getSetting("compressor", NULL);
		$this->archiveManager = new ArchiveManager($this->env, $compressor, $this->getSettings());
	}

	public function getArchiveManager() {
		return $this->archiveManager;
	}

	public function getItemContextData() {}

	public function getSessionInfo() {
		$result = array("actions" => array());
		foreach ($this->archiveManager->getActions() as $ac) {
			$result["actions"][$ac] = $this->archiveManager->isActionEnabled($ac);
		}
		return $result;
	}

	public function __toString() {
		return "ArchiverPlugin";
	}
}
?>