<?php

/**
 * page_database.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

include "install/installation_page.php";
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Mollify Installation", "init");?>

	<?php pageBody("1/2 Database Information");?>

	<p>
		Mollify will be installed in following SQLite database: <code><?php echo realpath($installer->db()->file());?></code>
	</p>
	<p>
		If this configuration is correct, click "Continue Installation". Otherwise, modify the configuration file and click "Refresh Configuration".
	</p>
	<p>
		<a href="javascript: action('continue_db');" class="btn btn-success" >Continue Installation</a>
		<a href="javascript: action('refresh');" class="btn btn-default">Refresh Configuration</a>
	</p>

	<?php pageFooter();?>
</html>