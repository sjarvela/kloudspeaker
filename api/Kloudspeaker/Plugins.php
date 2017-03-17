<?php
namespace Kloudspeaker;

class Plugins {
    public function __construct($container) {
        $this->container = $container;
    }

    public function getSessionInfo() {
        return [];
    }

    public function get($id) {
		return NULL;
    }
}