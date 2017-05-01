<?php

namespace Kloudspeaker\Setup;

class Installer {
	public function __construct($c) {
		$this->container = $c;
	}

	public function initialize() {
		$this->container->commands->register('install', [$this, 'doInstall']);
	}

	public function doInstall($opts) {
		echo "install" . \Kloudspeaker\Utils::array2str($opts);
	}
}