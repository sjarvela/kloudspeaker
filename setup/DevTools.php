<?php

namespace Kloudspeaker\Setup;

class DevTools {
	public function __construct($c) {
		$this->container = $c;
		$this->logger = $c->logger;
	}

	public function initialize() {
		$this->container->commands->register('dev:migration', [$this, 'cmdMigration']);
	}

	public function cmdMigration($cmds, $opts) {
		$this->logger->info("Migration: cmd=".\Kloudspeaker\Utils::array2str($cmds).", opts=".\Kloudspeaker\Utils::array2str($opts));

		if (count($cmds) < 1) throw new \Kloudspeaker\Command\CommandException("No migration command defined");

		$cmd = $cmds[0];

		switch($cmd) {
			case 'add':
				if (count($cmds) < 2) throw new \Kloudspeaker\Command\CommandException("No migration target defined");
				$target = $cmds[1];

				$id = \Kloudspeaker\Utils::guidv4();
				list($t1, $t2) = explode(":", $target, 2);

				if ($t1 == 'plugin') {
					$this->logger->info("Adding new plugin $t2 migration: $id");

					$info = $this->getPluginVersionInfo($t2);
					$this->logger->debug("Current plugin versions: ".\Kloudspeaker\Utils::array2str($info));

					$info["versions"][] = ["id" => $id, "name" => "", "description" => ""];
					$this->logger->debug("New versions: ".\Kloudspeaker\Utils::array2str($info));
					$this->storePluginVersionInfo($t2, $info);
					return [];
				} else if ($t1 == 'system') {
					$this->logger->info("Adding new migration: $id");

					$info = $this->getVersionInfo();
					$this->logger->debug("Current versions: ".\Kloudspeaker\Utils::array2str($info));

					$info["versions"][] = ["id" => $id, "name" => "", "description" => ""];
					$this->logger->debug("New versions: ".\Kloudspeaker\Utils::array2str($info));
					$this->storeVersionInfo($info);
					return [];
				} else {
					throw new \Kloudspeaker\Command\CommandException("Invalid target $t1");
				}
			default:
				throw new \Kloudspeaker\Command\CommandException("Invalid migration command $cmd");
		}
	}

	public function getVersionInfo() {
		return json_decode($this->readFile('/setup/db/migrations.json'), TRUE);
	}

	public function getPluginVersionInfo($id) {
		$plugin = $this->container->plugins->get($id);
		$path = $plugin["root"].'/db/migrations.json';
		if (!file_exists($path)) return ['versions' => []];
		return json_decode(file_get_contents($path), TRUE);
	}

	public function storeVersionInfo($info) {
		return $this->writeFile('/setup/db/migrations.json', json_encode($info));
	}

	public function storePluginVersionInfo($id, $info) {
		$plugin = $this->container->plugins->get($id);
		file_put_contents($plugin["root"].'/db/migrations.json', json_encode($info));
	}

	private function readFile($path) {
		return file_get_contents($this->container->configuration->getInstallationRoot() . $path);
	}

	private function writeFile($path, $content) {
		return file_put_contents($this->container->configuration->getInstallationRoot() . $path, $content);
	}
}