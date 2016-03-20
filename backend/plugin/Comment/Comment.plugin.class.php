<?php

/**
 * Comment.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "CommentHandler.class.php";

class Comment extends PluginBase {
	private $handler;

	public function version() {
		return "1_0";
	}

	public function versionHistory() {
		return array("1_0");
	}

	public function setup() {
		$this->addService("comment", "CommentServices");

		$this->handler = new CommentHandler($this->env);
		$this->env->events()->register("filesystem/", $this->handler);

		$this->env->filesystem()->registerSearcher($this->handler);

		$this->env->permissions()->registerFilesystemPermission("comment_item");

		$this->env->filesystem()->registerDataRequestPlugin(array("plugin-comment-count"), $this->handler);
		$this->env->filesystem()->registerItemContextPlugin("plugin-comment", $this->handler);
		$this->env->filesystem()->registerItemCleanupHandler($this->handler);

		if ($this->env->plugins()->hasPlugin("ItemDetails")) {
			$dp = $this->env->plugins()->getPlugin("ItemDetails");
			$dp->registerDetailsProvider("plugin-comments", $this->handler);
		}
	}

	public function getHandler() {
		return $this->handler;
	}

	public function getClientModuleId() {
		return "kloudspeaker/comment";
	}

	public function __toString() {
		return "CommentPlugin";
	}
}
?>