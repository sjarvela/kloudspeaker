<?php
$CONFIGURATION = array(
	//"client_page" => "myindex.php",
	"no_dev_urandom" => TRUE,
	"debug" => TRUE,
	"email_login" => TRUE,
	"db" => array(
		/*"type" => "pdo",
		"str" => "sqlite:/Applications/MAMP/htdocs/mollify/pdo_sqlite3_2_4.db",
		"user" => "mollify",
		"password" => "mollify",*/

		//"type" => "sqlite3",
		//"file" => "/Applications/MAMP/htdocs/mollify/sqlite3_2_4.db",

		/*"type" => "pdo",
		"str" => "mysql:host=localhost;dbname=mollify22",
		"user" => "mollify22",
		"password" => "mollify22",*/

		"type" => "mysql",
		"database" => "mollify_test",
		"user" => "mollify_test",
		"password" => "mollify",
		"charset" => "utf8",
	),
	"host_public_address" => "http://localhost:8888",
	"forbidden_file_upload_types" => array("png"),
	"authentication_methods" => array("pw", "ldap", "remote"),
	"timezone" => "Europe/Helsinki", // change this to match your timezone,
	"enable_mail_notification" => TRUE,
	"mail_notification_from" => "admin@yourhost.com",
	//"enable_change_password" => FALSE,
	"published_folders_root" => "/projects/mollify/data",
	"customizations_folder" => "../custom", //"/Applications/MAMP/htdocs/mollify/custom/",
	"customizations_folder_url" => "http://localhost:8888/mollify/custom/",
	//"enable_descriptions" => FALSE,
	"enable_thumbnails" => TRUE,
	//"mail_sender_class" => "mail/PHPMailerSender.class.php",
	"enable_limited_http_methods" => TRUE,
	"mail_smtp" => array(
		"host" => "smtp.gmail.com",
		"username" => "samuli.jarvela@gmail.com",
		"password" => "xxx",
		"secure" => TRUE,
	),

	"plugins" => array(
		"Archiver" => array("enable_download" => TRUE, "enable_compress" => TRUE),
		"Comment" => array(),
		"Share" => array(),
		"FileViewerEditor" => array(
			"viewers" => array(
				"Image" => array("gif", "png", "jpg"),
				"Google" => array("pdf", "tiff", "doc"),
				"JPlayer" => array("mp3"),
				"Direct" => array("pdf"),
			),
			"previewers" => array(
				"Image" => array("gif", "png", "jpg"),
			),
			"editors" => array(
				"CKEditor" => array("html"),
				"TextFile" => array("txt", "js", "css", "xml", "xhtml", "py", "c", "cpp", "as3", "sh", "java", "sql", "php"),
			),
		),
		"ItemDetails" => array(),
		"ItemCollection" => array(),
		//"SendViaEmail" => array(),
		"Notificator" => array(
			"dynamic_rules" => array(
				"events" => array(
					"My Rule" => "custom/MyNotificator:MyEventsSelector",
				),
				"users" => array(
					"My Rule" => "custom/MyNotificator:MyUserSelector",
				),
				"recipients" => array(
					"My Rule" => "custom/MyNotificator:MyRecipientSelector",
				),
			),
		),
		"EventLogging" => array(),
		"Registration" => array(
			"require_approval" => TRUE,
			"groups" => array("5", "22"),
			"permissions" => array(
				"filesystem_item_access" => "r",
				"edit_description" => "0",
			),
			"user_folder" => array(
				"path" => "/projects/mollify/data/users/",
				"permissions" => array(
					"filesystem_item_access" => "rw",
					"edit_description" => "1",
				),
			),
			"folders" => array(
				"1" => array(
					"permissions" => "rw",
				),
			),
		),
		"LostPassword" => array(
			"enable_hint" => TRUE,
		),
		"History" => array(
			"custom" => TRUE,
			"folder" => "/projects/mollify/data/history",
			"max_versions" => 3,
			"exclude_folders" => array("2"),
			"version_on_copy" => FALSE,
			"version_on_move" => TRUE,
		),
		"Quota" => array(
			"custom" => TRUE,
			"registration_user_folder_quota" => 100,
		),
		"Watermarking" => array(
			"types" => array(
				"pdf" => array("cls" => "PDFMarker", "position" => array("center", "center"), "rotation" => 45),
			),
			//"watermark_fn" => "MyWatermarkSelector",
			//"watermark_file" => "/projects/mollify/data/test/mollify.png",
			"watermark_text" => "Confidential for %username%",
			//"exclude_groups" => array("5")
		),
	),
);

function MyWatermarkSelector($env, $item) {
	return "/projects/mollify/data/test/sort-asc.png";
}
?>