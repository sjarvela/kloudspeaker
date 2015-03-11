<?php

/**
 * page_installed.php
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
	<?php pageHeader("Mollify Installation");?>

	<?php pageBody();?>

	<?php if ($installer->isCurrentVersionInstalled()) {?>
		<p>
			Mollify is already installed.
		</p>
	<?php } else {?>
		<p>
			Mollify is already installed, but needs updating.
		</p>
		<p>
			Open <a href="../update/">Mollify updater</a> to update.
		</p>
	<?php }?>

	<?php pageFooter();?>
</html>