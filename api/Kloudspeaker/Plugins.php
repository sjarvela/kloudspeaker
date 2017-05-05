<?php
namespace Kloudspeaker;

class Plugins {
	private $plugins = [];
	private $pluginsById = [];

    public function __construct($container) {
        $this->container = $container;
    }

    public function initialize() {
    	foreach ($this->container->configuration->get('plugins', []) as $pl => $conf) {
    		$this->container->logger->debug("Initializing plugin $pl", $conf);

    		if (strpos($pl, "/") !== FALSE)
    			$plugin = $this->container->api->loadModule($pl, $conf);
    		else {
    			//legacy

    		}
    	}
    }

    public function getSessionInfo() {
        return [];
    }

    public function register($plugin) {
    	$this->plugins[] = $plugin;
    	$this->pluginsById[$plugin["id"]] = $plugin;
    }

    public function get($id = NULL) {
    	if ($id == NULL)
    		return $this->plugins;
		return $this->pluginsById[$id];
    }
}