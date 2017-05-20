<?php
namespace Kloudspeaker\Plugins\Comment;

class CommentPlugin extends \Kloudspeaker\Plugins\AbstractPlugin {
	public function __construct($container, $config) {
		parent::__construct($container);
	}

	public function initialize($setup) {

	}

	public function getPluginInfo() {
		return array_merge(parent::getPluginInfo(), [
			"id" => "comment",
			"client_module" => TRUE,
			"db" => TRUE,
		]);
	}
}