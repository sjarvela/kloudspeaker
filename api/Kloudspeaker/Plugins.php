<?php
namespace Kloudspeaker;

class Plugins {
	private $plugins = [];
	private $pluginsById = [];
    //private $legacyPlugins = [];

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

        if (strpos($m, "/") !== FALSE)
            $plugin = $this->container->api->loadModule("plugin:".$m, $conf);
        else {
            //legacy
            $plugin = $this->container->legacy->env->plugins->load($m, $conf);
            //$legacyPlugins[] = $m;
        }

        $id = $this->register($plugin);
        $this->pluginsById[$id]["module"] = $m;

        return $this->pluginsById[$id];
    }

    public function getSessionInfo() {
        return [];
    }

    public function register($plugin) {
        if (!method_exists($plugin, "getPluginInfo"))
            throw new \KloudspeakerException("Module does not seem to be plugin: $module");
        $info = $plugin->getPluginInfo();
        if (array_key_exists($info["id"], $this->pluginsById))
            throw new KloudspeakerException("Duplicate plugin module: ".$info["id"]);

        $r = new \ReflectionClass($plugin);
        $info["root"] = dirname($r->getFileName());
        $info["cls"] = $plugin;

    	$this->plugins[] = $info;
        $this->pluginsById[$info["id"]] = $info;

        return $info["id"];
    }

    public function get($id = NULL) {
    	if ($id == NULL)
    		return $this->plugins;
		return $this->pluginsById[$id];
    }

    public function is($id) {
        return isset($this->pluginsById[$id]);
    }
}