<?php

namespace Kloudspeaker\Setup;

class DevTools {
	public function __construct($c) {
		$this->container = $c;
		$this->logger = $c->logger;
	}

	public function initialize() {
		$this->container->commands->register('dev:add-migration', [$this, 'addMigration']);
	}

	public function addMigration() {
		$this->logger->info("Adding new migration");

		
	}
}