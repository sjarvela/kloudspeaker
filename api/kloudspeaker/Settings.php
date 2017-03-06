<?php
namespace Kloudspeaker;

class Settings {

    public function __construct($container, $config) {
        $this->config = $config;
    }

    public function get($name, $defaultValue = NULL) {
    	if ($this->has($name))
    		return $this->config[$name];
		return $defaultValue;
    }

	public function has($name) {
		return array_key_exists($name, $this->config);
	}
}