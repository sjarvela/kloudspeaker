<?php
namespace Kloudspeaker\Plugins;

class AbstractPlugin {
	public function __construct($container) {
		$this->container = $container;
	}

	public function initialize($setup) {
	}

	protected function item($id) {
		return $this->container->filesystem->item($id);
	}

	public function getPluginInfo() {
		return [
			"id" => NULL,
			"client_module" => NULL,
			"db" => FALSE,
		];
	}
}