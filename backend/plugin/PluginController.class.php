<?php

/**
 * PluginController.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "PluginBase.class.php";

class PluginController {
	protected $env;
	protected $plugins;

	public function __construct($env) {
		$this->env = $env;
		$this->plugins = array();
	}

	public function setup() {
		if (!$this->env->settings()->hasSetting("plugins")) {
			return;
		}

		$plugins = $this->env->settings()->setting("plugins");
		if (!is_array($plugins)) {
			throw new ServiceException("INVALID_CONFIGURATION");
		}

		foreach ($plugins as $p => $settings) {
			$this->addPlugin($p, $settings);
		}

		foreach ($this->plugins as $id => $p) {
			$p->setup();
		}
	}

	private function addPlugin($id, $settings) {
		if (isset($settings["custom"]) and $settings["custom"] == TRUE) {
			$this->env->resources()->loadCustomPlugin($id);
		} else {
			$cls = $id . "/" . $id . ".plugin.class.php";
			$path = dirname(__FILE__) . DIRECTORY_SEPARATOR . $cls;
			if (!file_exists($path)) {
				throw new ServiceException("INVALID_CONFIGURATION", "Plugin not found: " . $id);
			}

			require_once $cls;
		}
		$p = new $id($this->env, $id, $settings);
		$this->plugins[$id] = $p;
	}

	public function getPlugins() {
		return $this->plugins;
	}

	public function get($id = NULL) {
		if ($id == NULL) return $this->getPlugins();
		return $this->getPlugin($id);
	}

	public function getPlugin($id) {
		return $this->plugins[$id];
	}

	public function hasPlugin($id) {
		return isset($this->plugins[$id]);
	}

	public function exists($id) {
		return $this->hasPlugin($id);
	}

	public function getSessionInfo() {
		$result = array();
		$settings = $this->env->settings()->setting("plugins");

		foreach ($this->plugins as $id => $p) {
			$s = $settings[$id];
			$custom = (isset($s["custom"]) and $s["custom"] == TRUE);

			$info = $p->getSessionInfo();
			$info["custom"] = $custom;
			$info["admin"] = $p->hasAdminView();

			$clientPlugin = $p->getClientPlugin();
			if ($clientPlugin != NULL) {
				$info["client_plugin"] = $custom ? $this->env->resources()->getCustomPluginUrl($id, $clientPlugin) : $this->env->getPluginUrl($id, $clientPlugin, TRUE);
			}

			$clientModule = $p->getClientModuleId();
			if ($clientModule != NULL) {
				$path = "client/";
				$info["client_module_path"] = $custom ? $this->env->resources()->getCustomPluginUrl($id, $path) : $this->env->getPluginUrl($id, $path, TRUE);
				$info["client_module_id"] = $clientModule;
			}
			
			$result[$id] = $info;
		}
		return $result;
	}

	public function initialize() {
		foreach ($this->plugins as $id => $p) {
			$p->initialize();
		}
	}

	public function __toString() {
		return "PluginController";
	}
}
?>
