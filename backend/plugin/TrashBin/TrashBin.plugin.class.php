<?php

/**
 * TrashBin.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */


class TrashBin extends PluginBase {
	private $handler;

	public function setup() {
		//$this->addService("trash", "TrashCanServices");
	}

	public function getClientPlugin() {
		return "client/plugin.js";
	}

	public function __toString() {
		return "TrashBinPlugin";
	}
}
?>
