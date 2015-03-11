<?php

/**
 * page_instructions_configuration_create.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

include "installation_page.php";
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Kloudspeaker Installation", "init");?>

	<?php pageBody("Welcome to Kloudspeaker installation");?>

	<?php if ($installer->action() == 'retry') {?>
		<p>
			<div class="bs-callout bs-callout-danger">
				<h4>Configuration file cannot be found.</h4>
				<p>
					Make sure that the file "<code>configuration.php</code>"
					<ul>
						<li>is located in the Kloudspeaker <code>backend</code> folder</li>
						<li>is accessible to PHP</li>
					</ul>
				</p>
			</div>
		</p>
	<?php }?>

	<p>
		To begin with the installation process, create configuration file called "<code>configuration.php</code>" in the Kloudspeaker backend directory. Example configuration files can be found from <code>backend/example</code>.
	</p>
	<p>
		Alternatively, you can create full configuration based on <a href="https://github.com/sjarvela/kloudspeaker/wiki/Installation">Installation instructions</a>.
	</p>
	<p>
		<a href="javascript: action('retry')" class="btn btn-success">Continue</a>
	</p>

	<?php pageFooter();?>
</html>