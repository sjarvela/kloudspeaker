<html>
	<head>
		<script type="text/javascript" language="javascript" src="<?php print $resourcesUrl ?>/jquery-1.4.2.min.js"></script>
		<script>
			$(document).ready(function() {
				var loc = window.location;
				$.get(loc+"?ac=prepare", function(r) {
					$("#itemcollection-preparing").hide();
					$("#itemcollection-downloading").show();
					window.location = loc + "?ac=download&id="+encodeURIComponent(r.result.id);
				});
			});
		</script>
	</head>
	<body>
		<div id="itemcollection-empty">
		The collection you requested is empty.
		</div>
	</body>
</html>