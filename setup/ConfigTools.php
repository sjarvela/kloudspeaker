<?php

namespace Kloudspeaker\Setup;

class ConfigTools {
	public function __construct($c) {
		$this->container = $c;
		$this->logger = $c->logger;
	}

	public function initialize() {
		$this->container->commands->register('config:get', [$this, 'cmdGet']);
		$this->container->commands->register('config:set', [$this, 'cmdSet']);
		$this->container->commands->register('config:plugins', [$this, 'cmdPlugins']);
		//$this->container->commands->register('dev:add-plugin', [$this, 'addPlugin']);
	}

	public function cmdGet($cmds, $opts) {
		$this->logger->info("Get: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) return NULL;

		switch ($cmds[0]) {
			case 'raw':
				$s = var_export($this->container->configuration->values(), true);
				if (array_key_exists("file", $opts)) {
					$this->storeConfiguration($s, $opts["file"]);

					return TRUE;
				} else return $s;
			case 'value':
				if (count($cmds) != 2) return NULL;
				return $this->container->configuration->get($cmds[1]);
			default:
				return NULL;
		}
	}

	public function cmdSet($cmds, $opts) {
		$this->logger->info("Set: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) return NULL;

		switch ($cmds[0]) {
			case 'value':
				$values = $this->container->configuration->values();
				for ($i=1; $i < count($cmds); $i++) { 
					$p = explode("=", $cmds[$i]);
					if (count($p) != 2) throw new \Kloudspeaker\KloudspeakerException("Invalid value definition: ".$cmds[$i]);

				}

			default:
				return NULL;
		}
	}

	public function cmdPlugins($cmds, $opts) {
		$this->logger->info("Plugins: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) return NULL;

		switch ($cmds[0]) {
			case 'list':
				return array_keys($this->container->configuration->get("plugins"));
			default:
				return NULL;
		}
	}

	private function storeConfiguration($c, $file) {
		if (!is_writable($file)) throw new \Kloudspeaker\KloudspeakerException("File not writable $file");
		file_put_contents($file, "<?php\n\$CONFIGURATION = ".$c.";");
	}

	public function addPlugin() {

	}
}