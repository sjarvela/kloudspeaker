<?php

/**
 * page_admin.php
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
	<?php pageHeader("kloudspeaker Installation", "init");?>

	<?php pageBody("2/2 Administrator User");?>

	<h4>
		kloudspeaker requires an administrator user
	</h4>
	<p>
		<form id="admin-user" role="form">
			<div id='admin-username' class="form-group">
				<label for='username'>Username</label>
				<input id='username' class="form-control" type='text' name='user' value=''>
			</div>
			<div id='admin-password' class="form-group">
				<label for='password'>Password</label>
				<input id='password' class="form-control" type='password' name='password' value=''>
			</div>
		</form>
	</p>

	<p>
		Enter username and password, and click "Install" to finish installation.
	</p>
	<p>
		<a id="button-install" href="#" class="btn btn-success">Install</a>
	</p>

	<?php pageFooter();?>

	<script type="text/javascript">
		function validate() {
			$(".form-group").removeClass("has-error");

			var result = true;
			if ($("#username").val().length == 0) {
				$("#admin-username").addClass("has-error");
				result = false;
			}
			if ($("#password").val().length == 0) {
				$("#admin-password").addClass("has-error");
				result = false;
			}
			return result;
		}

		function init() {
			$("#button-install").click(function() {
				if (!validate()) return;

				setData("name", $("#username").val());
				setData("password", $("#password").val());
				action("install");
			});
		}
	</script>
</html>