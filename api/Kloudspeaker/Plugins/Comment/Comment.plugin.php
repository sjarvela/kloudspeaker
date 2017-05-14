<?php
namespace Kloudspeaker\Plugins\Comment;

class CommentPlugin {
	public function __construct($container, $config) {
		$this->container = $container;
	}

	public function initialize($setup) {

	}

	public function getPluginInfo() {
		return [
			"id" => "comment",
			"client_module" => TRUE,
			"db" => TRUE
		];
	}
 }