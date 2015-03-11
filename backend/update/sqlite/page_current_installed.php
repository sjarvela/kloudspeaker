<?php

/**
 * page_current_installed.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

include "install/installation_page.php";

function version($ver) {
	return str_replace("_", ".", $ver);
}
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Kloudspeaker Update");?>
	<?php pageBody("Update");?>
	<h4>No update is required.</h4>
	<?php pageFooter();?>
</html>