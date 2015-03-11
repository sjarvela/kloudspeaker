<?php

/**
 * page_installed.php
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

	<?php pageBody();?>

	<?php if ($installer->isCurrentVersionInstalled()) {?>
		<p>
			kloudspeaker is already installed.
		</p>
	<?php } else {?>
		<p>
			kloudspeaker is already installed, but needs updating.
		</p>
		<p>
			Open <a href="../update/">kloudspeaker updater</a> to update.
		</p>
	<?php }?>

	<?php pageFooter();?>
</html>