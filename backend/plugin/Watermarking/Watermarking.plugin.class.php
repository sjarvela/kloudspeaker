<?php

/**
 * Watermarking.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL license.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "WatermarkingManager.class.php";

class Watermarking extends PluginBase {
	public function setup() {
		$this->watermarkingManager = new WatermarkingManager($this->env, $this->getSettings());
		$this->env->filesystem()->registerActionInterceptor("plugin-watermarking", $this->watermarkingManager);
	}

	public function getSessionInfo() {
		$result = array();
		return $result;
	}

	public function getManager() {
		return $this->watermarkingManager;
	}

	public function __toString() {
		return "WatermarkingPlugin";
	}
}
?>