<?php

/**
 * installation_page.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

global $MAIN_PAGE, $installer;
if (!isset($MAIN_PAGE)) {
	die();
}

function pageHeader($title, $onLoad = NULL) {?>
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
			<title><?php echo ($title);?></title>
			<link rel="stylesheet" href="../resources/bootstrap/css/bootstrap.min.css">
			<link rel="stylesheet" href="../resources/bootstrap/css/bootstrap-theme.min.css">
			<link rel="stylesheet" href="../install/resources/install.css">

			<script type="text/javascript" src="../resources/jquery.min.js"></script>
			<script type="text/javascript" src="../resources/bootstrap/js/bootstrap.min.js"></script>
			<script type="text/javascript" src="../install/resources/install.js"></script>
			<script type="text/javascript">
			<?php if ($onLoad != NULL) {?>
				$(document).ready(function() {
					<?php echo ($onLoad);?>();
				 });
			<?php }?>
			</script>
		</head>
	<body>
		<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
			<div class="container">
				<div class="navbar-header">
					<a class="navbar-brand" href="#"><?php echo $title;?></a>
				</div>
			</div>
		</div>
		<?php
}

function pageBody($title = NULL) {
	global $installer;?>

		<div id="content" class="container">
			<?php if ($title != NULL) {?>
				<h2><?php echo $title;?></h2>
			<?php }?>

			<?php if (isset($installer) and $installer->hasError()) {?>
			<p>
				<div class="bs-callout bs-callout-danger">
					<h4><?php echo $installer->error();?></h4>
					<?php if ($installer->hasErrorDetails()) {?><p><?php echo $installer->errorDetails();?></p><?php }?>
				</div>
			</p>
			<?php }?>

			<form id="page-data" method="post">
			<?php if (isset($installer)) {
		foreach ($installer->data() as $key => $val) {
			if ($key != 'action' and $key != 'updates') {
				echo '<input type="hidden" name="' . $key . '" value="' . $val . '">';
			}

		};
	}

	?>
			</form>
		<?php
}

function pageFooter() {?>
 		</div>
 		<div class="footer">
	 		<div class="container">
	 			Copyright &copy; Samuli J&auml;rvel&auml; 2008 -
	 		</div>
 		</div>
	</body><?php
}
?>