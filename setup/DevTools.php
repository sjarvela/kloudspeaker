<?php

namespace Kloudspeaker\Setup;

class DevTools {
	public function __construct($c, $installer) {
		$this->container = $c;
		$this->installer = $installer;
		$this->logger = $c->logger;
	}

	public function initialize() {
		$this->container->commands->register('dev:add-migration', [$this, 'addMigration']);
	}

	public function addMigration() {
		$id = \Kloudspeaker\Utils::guidv4();
		$this->logger->info("Adding new migration: $id");

		$info = $this->getVersionInfo();
		$this->logger->debug("Current versions: ".\Kloudspeaker\Utils::array2str($info));

		$info["versions"][] = ["id" => $id, "name" => "", "description" => ""];
		$this->logger->debug("New versions: ".\Kloudspeaker\Utils::array2str($info));
		$this->storeVersionInfo($info);
	}

	public function getVersionInfo() {
		return json_decode($this->readFile('/setup/db/migrations.json'), TRUE);
	}

	public function storeVersionInfo($info) {
		return $this->writeFile('/setup/db/migrations.json', json_encode($info));
	}

	private function readFile($path) {
		return file_get_contents($this->container->configuration->getInstallationRoot() . $path);
	}

	private function writeFile($path, $content) {
		return file_put_contents($this->container->configuration->getInstallationRoot() . $path, $content);
	}
}