<?php

/**
 * MarkerBase.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

abstract class MarkerBase {
	protected $controller;
	protected $env;
	protected $type;
	protected $id;
	protected $conf;

	public function __construct($controller, $type, $id, $conf) {
		$this->controller = $controller;
		$this->env = $controller->env();
		$this->type = $type;
		$this->id = $id;
		$this->conf = $conf;
	}

	abstract function mark($src, $dest, $watermarkText);

	protected function getSetting($name, $default = NULL) {
		if (!$this->conf or !isset($this->conf[$name])) {
			return $default;
		}

		return $this->conf[$name];
	}
}
?>