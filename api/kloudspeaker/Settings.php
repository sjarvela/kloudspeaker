<?php
namespace Kloudspeaker;

class Settings {

    public function __construct($container) {
        $this->container = $container;
    }

    public function setting($name, $defaultValue = NULL) {
		return $defaultValue;
    }
}