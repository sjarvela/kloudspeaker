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
	<?php pageHeader("Kloudspeaker Installation");?>

	<?php pageBody("SQLite Database Configuration");?>

	<?php if ($installer->action() === 'continue' and !$installer->hasError()) {?>
		<p>
			<div class="bs-callout bs-callout-danger">
				<h4>SQLite database file is not set.</h4>
			</div>
		</p>
	<?php }?>

	<p>
		Installer needs the SQLite database file location set in "<code>configuration.php</code>":

		For more information, see <a href="https://github.com/sjarvela/kloudspeaker/wiki/Installation">Installation instructions</a>.
	</p>

	<p>
		An example configuration:
		<pre>&lt;?php
$CONFIGURATION = array(
	&quot;db&quot; => array(
		&quot;type&quot; => &quot;sqlite&quot;,
		&quot;file&quot; => &quot;<span class="value">[SQLITE FILE PATH HERE]</span>&quot;
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