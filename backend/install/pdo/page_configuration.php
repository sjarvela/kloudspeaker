<?php

/**
 * page_configuration.php
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
	<?php pageHeader("Kloudspeaker Installation", "init");?>

	<?php pageBody("PDO Database Configuration");?>

	<?php if ($installer->action() === 'continue' and !$installer->hasError()) {?>
		<p>
			<div class="bs-callout bs-callout-danger">
				<h4>No database configuration found.</h4>
				<p>PDO database configuration is missing or it is not complete. Make sure that the configuration is done according to the instructions below. At minimum, database user and password must be defined.</p>
			</div>
		</p>
	<?php }?>

	<p>
		Installer needs the database connection information defined in the configuration file "<code>configuration.php</code>":
		<ul>
			<li>PDO connection string (see <a href="http://www.php.net/manual/en/pdo.connections.php">http://www.php.net/manual/en/pdo.connections.php</a>)</li>
			<li>User</li>
			<li>Password</li>
			<li>Table prefix (optional)</li>
		</ul>

		For more information, see <a href="https://github.com/sjarvela/kloudspeaker/wiki/Installation">Installation instructions</a>.
	</p>
	<p>
		An example configuration:
		<pre>&lt;?php
$CONFIGURATION = array(
	&quot;db&quot; => array(
		&quot;type&quot; => &quot;pdo&quot;,
		&quot;str&quot; => &quot;<span class="value">mysql:host=localhost;dbname=kloudspeaker</span>&quot;,
		&quot;user&quot; => &quot;<span class="value">[DB_USERNAME]</span>&quot;,
		&quot;password&quot; => &quot;<span class="value">[DB_PASSWORD]</span>&quot;,
		&quot;table_prefix&quot; => &quot;<span class="value">kloudspeaker_</span>&quot;
	)
);
?&gt;</pre>
	</p>
	<p>
		Edit the configuration and click "Continue".
	</p>
	<p>
		<a class="btn btn-success" href="javascript: action('continue');">Continue</a>
	</p>

<?php pageFooter();?>
</html>