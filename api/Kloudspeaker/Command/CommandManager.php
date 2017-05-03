<?php
namespace Kloudspeaker\Command;

class CommandManager {
	private $cmds = [];
	private $cmdNames = [];
	private $cmdNamesByGroup = [];
	
	public function __construct($container) {
        $this->logger = $container->logger;
    }

	public function get($name = NULL) {
		if ($name == NULL)
			return $this->cmdNames;
		return array_key_exists($name, $this->cmdNamesByGroup) ? $this->cmdNamesByGroup[$name] : [];
	}

	public function register($cmd, $c) {
		$cb = $c;	//obj

		$parts = explode(":", $cmd);
		if (count($parts) == 2) {
			if (!array_key_exists($parts[0], $this->cmdNamesByGroup))
				$this->cmdNamesByGroup[$parts[0]] = [];
			$this->cmdNamesByGroup[$parts[0]][] = $parts[1];
		}
		$this->cmdNames[] = $cmd;
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