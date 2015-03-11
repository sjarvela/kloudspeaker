<?php
	/**
	 * check.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	//change this to FALSE to enable script
	if (TRUE) die();
	
	// ================================
	
	if (!file_exists("configuration.php")) die("Configuration file does not exist");
	
	$conf = file_get_contents("configuration.php");
	if (!$conf) die("Could not read configuration");
	
	if (strcmp("<?php", substr($conf, 0, 5)) != 0) die("Configuration file does not start with PHP start tag (\"&lt;?php\"). Remove all characters before that tag.");
	if (strcmp("?>", substr($conf, -2)) != 0) die("Configuration file does not end with PHP end tag (\"?&gt;\"). Remove all characters after that tag.");
	
	die("Configuration file OK");
?>