<?php

require_once "Installer.php";
require_once "ConfigTools.php";

function autoload_kloudspeaker_setup($container) {
	$installer = new \Kloudspeaker\Setup\Installer($container);
	$installer->initialize();

	$configTools = new \Kloudspeaker\Setup\ConfigTools($container);
	$configTools->initialize();

	if ($container->configuration->is("dev")) {
	    require 'DevTools.php';
	    $devTools = new \Kloudspeaker\Setup\DevTools($container, $installer);
	    $devTools->initialize();
	}
}