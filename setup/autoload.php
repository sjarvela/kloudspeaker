<?php

require_once "Installer.php";
require_once "ConfigTools.php";

function autoload_kloudspeaker_setup($container) {
	$installer = new \Kloudspeaker\Setup\Installer($container);
	$installer->initialize();

	$container["installer"] = $installer;

	$configTools = new \Kloudspeaker\Setup\ConfigTools($container);
	$configTools->initialize();

	$container["config_tools"] = $configTools;

	if ($container->configuration->is("dev")) {
	    require 'DevTools.php';
	    $devTools = new \Kloudspeaker\Setup\DevTools($container);
	    $devTools->initialize();

	    $container["dev_tools"] = $devTools;
	}
}