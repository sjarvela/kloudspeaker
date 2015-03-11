<?php

/**
 * page_database.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

include "install/installation_page.php";
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("kloudspeaker Installation");?>

	<?php pageBody("1/2 Database Information");?>

	<p>
		kloudspeaker will be installed in following database:
		<ul>
			<li><b>Host name:</b> <code><?php echo $installer->db()->host();?></code></li>
			<li><b>Database name:</b> <code><?php echo $installer->db()->database();?></code></li>
			<li><b>User:</b> <code><?php echo $installer->db()->user();?></code></li>
			<?php if ($installer->db()->tablePrefix() != '') {?><li><b>Table prefix:</b> <code><?php echo $installer->db()->tablePrefix();?></code></li><?php }?>
		</ul>
	</p>
	<?php if (!$installer->db()->databaseExists()) {?>
		<p>
			<div class="bs-callout bs-callout-warning">
				<h4>Database "<code><?php echo $installer->db()->database();?></code>" does not exist or user "<code><?php echo $installer->db()->user();?></code>" does not have access permissions.</h4>
				<p>If you continue installation, installer will try to create it.</p>
				<p>If you wish to create the database and associate user permissions manually instead, click "Refresh Configuration" when ready.</p>
			</div>
		</p>
	<?php }?>

	<p>
		If this configuration is correct, click "Continue Installation". Otherwise, modify the configuration file and click "Refresh Configuration".
	</p>
	<p>
		<a href="javascript: action('continue_db');" class="btn btn-success" >Continue Installation</a>
		<a href="javascript: action('refresh');" class="btn btn-default">Refresh Configuration</a>
	</p>

	<?php pageFooter();?>
</html>