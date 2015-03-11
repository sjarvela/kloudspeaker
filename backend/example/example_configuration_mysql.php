<?php

/* For configuration instructions, see ReadMe.txt or wiki page at https://github.com/sjarvela/kloudspeaker/wiki/Installation */

$CONFIGURATION = array(
	"db" => array(
		"type" => "mysql",
		"database" => "kloudspeaker",
		"user" => "kloudspeaker",
		"password" => "kloudspeaker",
		"charset" => "utf8",
	),
	"timezone" => "Europe/Helsinki", // change this to match your timezone

	"plugins" => array(
		"FileViewerEditor" => array(
			"viewers" => array(
				"Image" => array("gif", "png", "jpg"),
			),
			"previewers" => array(
				"Image" => array("gif", "png", "jpg"),
			),
		),
		"ItemDetails" => array(),
	),
);

?>