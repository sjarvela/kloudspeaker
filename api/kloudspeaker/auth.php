<?php
namespace Kloudspeaker;

class Auth {
    public function __construct($container) {
        $this->container = $container;
    }

    public function isLoggedIn() {
    	return FALSE;
    }
}