<?php

/**
 * page_update.php
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
	<?php pageHeader("Kloudspeaker Update", "init");?>
	<?php pageBody("Database Update");?>

	<p>
		<?php echo $installer->updateSummary();?>
	</p>
	<p>
		Click "Update" to start update.
	</p>
	<p>
		<a id="button-update" href="#" class="btn btn-success">Update</a>
	</p>

	<?php pageFooter();?>

	<script type="text/javascript">
		function init() {
			$("#button-update").click(function() {
				action("update");
			});
		}
	</script>
</html>