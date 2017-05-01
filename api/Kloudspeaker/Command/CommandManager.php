<?php
namespace Kloudspeaker\Command;

class CommandManager {
	private $cmds = [];
	
	public function __construct($container) {
        $this->logger = $container->logger;
    }

	public function get() {
		return $this->cmds;
	}

	public function register($cmd, $cb) {
		$this->cmds[$cmd] = $cb;
	}

	public function exists($name) {
		return array_key_exists($name, $this->cmds);
	}

	public function execute($name, $opts) {
		$cmd = $this->cmds[$name];

		if (is_object($cmd)) {
			return $cmd->execute($name, $opts);
		} else if (is_string($cmd)) {
			return $cmd($name, $opts);
		} else if (is_callable($cmd)) {
			return call_user_func_array($cmd, [$opts]);
		} else {
			throw new \Kloudspeaker\KloudspeakerException("Invalid command ".$name);
		}
	}
}