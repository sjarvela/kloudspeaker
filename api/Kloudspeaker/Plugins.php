<?php
namespace Kloudspeaker;

class Plugins {
	private $pluginsById = [];

	public function __construct($container) {
		$this->container = $container;
		$this->logger = $container->logger;
	}

	public function initialize() {
		foreach ($this->container->configuration->get('plugins', []) as $m => $conf) {
			$this->load($m, $conf);
		}
	}

	public function load($m, $conf) {
		$this->container->logger->debug("Initializing plugin module: $m", $conf);

		if (!isset($conf["legacy"])) {
			$plugin = $this->container->api->loadModule("plugin:" . $m, $conf);
		} else {
			$plugin = $this->container->legacy->env->plugins->load($m, $conf);
		}

		$id = $this->register($plugin);
		$this->pluginsById[$id]["module"] = $m;

		return $this->pluginsById[$id];
	}

	public function getSessionInfo() {
		$result = [];
		foreach ($this->pluginsById as $id => $p) {
			$r = [
				"id" => $id,
			];
			if (isset($p["client_module"])) {
				$r["client"] = $p["client_module"];
			}
			$result[$id] = $r;
		}
		return $result;
	}

	public function register($plugin) {
		if (!method_exists($plugin, "getPluginInfo")) {
			throw new \Kloudspeaker\KloudspeakerException("Module does not seem to be plugin: $module");
		}

		$info = $plugin->getPluginInfo();
		if (array_key_exists($info["id"], $this->pluginsById)) {
			throw new \Kloudspeaker\KloudspeakerException("Duplicate plugin module: " . $info["id"]);
		}

		$r = new \ReflectionClass($plugin);
		$info["root"] = dirname($r->getFileName());
		$info["cls"] = $plugin;

		$this->pluginsById[$info["id"]] = $info;

		$this->container->api->group('/p/' . $info["id"], function () use ($info) {
			$this->get('/', function ($request, $response, $args) {
				//TODO plugin info
				$this->out->success([]);
			});
			if (isset($info["client_module"])) {
				$this->get('/client[/{path:.*}]', function ($request, $response, $args) use ($info) {
					$file = $info["root"] . "/client/" . $request->getAttribute('path');
					if (!file_exists($file)) {
						$this->out->error("Resource does not exist", 0, \Kloudspeaker\HttpCodes::NOT_FOUND);
					}

					echo file_get_contents($file);
				});
			}
			if (isset($info["api"])) {
				$info["api"]($this);
			}
		});

		return $info["id"];
	}

	public function urlFor($id) {
		$root = $this->container->api->url();
	}

	public function get($id = NULL) {
		if ($id == NULL) {
			return $this->plugins;
		}

		return $this->pluginsById[$id];
	}

	public function is($id) {
		return isset($this->pluginsById[$id]);
	}
}