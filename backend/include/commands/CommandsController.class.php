<?php
/**
 * CommandsController.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Kloudspeaker_CommandsController {
	private $env;
	private $cmds = array();

	public function __construct($env) {
		$this->env = $env;
	}

	public function initialize() {}

	public function register($name, $cmd) {
		$this->cmds[$name] = $cmd;
	}

	public function exists($name) {
		return array_key_exists($name, $this->cmds);
	}

	public function execute($name, $opts) {
		$cmd = $this->cmds[$name];

		if (is_object($cmd)) {
			$cmd->execute($name, $opts);
		} else if (is_string($cmd)) {
			$cmd($name, $opts);
		} else {
			throw new ServiceException("INVALID_CONFIGURATION", "Command definition not supported: ".$name);
		}
	}
}
?>