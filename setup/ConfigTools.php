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
		$this->container->commands->register('config:users', [$this, 'cmdUsers']);
		//$this->container->commands->register('dev:add-plugin', [$this, 'addPlugin']);
	}

	public function cmdGet($cmds, $opts) {
		$this->logger->info("Get: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) throw new \Kloudspeaker\Command\CommandException("No get command defined");

		switch ($cmds[0]) {
			case 'all':
				return $this->container->configuration->values();
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
				throw new \Kloudspeaker\Command\CommandException("Invalid command: ".$cmds[0]);
		}
	}

	public function cmdSet($cmds, $opts) {
		$this->logger->info("Set: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) throw new \Kloudspeaker\Command\CommandException("No set command defined");
		$set = 0;
		switch ($cmds[0]) {
			case 'value':
				$values = $this->container->configuration->values();
				for ($i=1; $i < count($cmds); $i++) { 
					$p = explode("=", $cmds[$i]);
					if (count($p) != 2) throw new \Kloudspeaker\Command\CommandException("Invalid value definition: ".$cmds[$i]);
					$pn = $p[0];
					$pv = $p[1];
					//TODO value type
					if ($pv == 'TRUE') $pv = TRUE;
					if ($pn == 'FALSE') $pv = FALSE;

					$this->logger->info("Setting $pn = $pv");
					$this->container->configuration->set($pn, $pv);
					$set = $set + 1;
				}
				break;

			default:
				return NULL;
		}

		if ($set > 0)
			$this->container->configuration->store();
		return TRUE;
	}

	public function cmdPlugins($cmds, $opts) {
		$this->logger->info("Plugins: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) throw new \Kloudspeaker\Command\CommandException("No plugins command defined");

		switch ($cmds[0]) {
			case 'list':
				return array_keys($this->container->configuration->get("plugins"));
			case 'add':
				$def = $cmds[1];
				//if (isset($opts["name"])) {
					// built-in/existing plugin
				$this->logger->info("Adding built-in/existing plugin:".$def);

				$root = $this->container->configuration->getInstallationRoot();
				$sitePath = $this->container->configuration->getSiteFolderLocation().DIRECTORY_SEPARATOR.$def.DIRECTORY_SEPARATOR;
				$builtInPath = $root.DIRECTORY_SEPARATOR."api".DIRECTORY_SEPARATOR.$def.DIRECTORY_SEPARATOR;
				$legacyPath = $root.DIRECTORY_SEPARATOR."backend".DIRECTORY_SEPARATOR.'plugin'.DIRECTORY_SEPARATOR.$def.DIRECTORY_SEPARATOR;
				$this->logger->info("Checking [$builtInPath]");

				$opts = [];
				if (file_exists($sitePath)) {
					$module = $def;
					$this->logger->info("Found site plugin from [$sitePath], loading $module");
				} else if (file_exists($builtInPath)) {
					$module = $def;
					$this->logger->info("Found built-in plugin from [$builtInPath], loading $module");
				} else if (file_exists($legacyPath)) {
					$module = "legacy:".$def;
					$opts["legacy"] = TRUE;
					$this->logger->info("Found legacy plugin from [$legacyPath], loading $module");
				} else {
					throw new \Kloudspeaker\Command\CommandException("Plugin not found: ".$def);
				}
				try {
					$plugin = $this->container->plugins->load($module, $opts);
				} catch (Exception $e) {
					$this->logger->error("Error loading plugin: ".$e->getMessage());
				}

				$this->logger->info("Plugin successfully loaded:".\Kloudspeaker\Utils::array2str($plugin));

				if ($this->container->configuration->has("plugins.".$module))
					throw new \Kloudspeaker\Command\CommandException("Plugin already configured");

				$this->container->configuration->set("plugins.".$module, []);
				$this->container->configuration->store();

				//check for installation
				$this->container->installer->installPlugin($plugin["id"]);
				/*} else if (isset($opts["file"])) {
					// zip
				} else if (isset($opts["url"])) {
					// download
				} else {
					throw new \Kloudspeaker\Command\CommandException("No plugin defined");
				}*/
				//if (count($cmds) < 2) throw new \Kloudspeaker\KloudspeakerException("Missing plugin id");
				//$id = $cmds[1];
				//if ($this->container->plugins->is($id)) throw new \Kloudspeaker\KloudspeakerException("Plugin already registered: ".$id);
				return ["success" => TRUE];
			default:
				return NULL;
		}
	}

	public function cmdUsers($cmds, $opts) {
		$this->logger->info("Users: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) == 0) throw new \Kloudspeaker\Command\CommandException("No users command defined");

		switch ($cmds[0]) {
			case 'list':
				return $this->container->users->get();
			case 'add':
				if (!isset($opts["username"])) throw new \Kloudspeaker\Command\CommandException("No username defined");
				if (!isset($opts["password"])) throw new \Kloudspeaker\Command\CommandException("No password defined");

				$this->logger->info("Adding new user:".$opts["username"]);

				$userId = $this->container->users->add(["name" => $opts["username"]], ["pw" => $opts["password"]]);
				
				return ["success" => TRUE, "user_id" => $userId];
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