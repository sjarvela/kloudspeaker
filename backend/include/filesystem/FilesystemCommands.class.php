<?php

/**
 * FilesystemCommands.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Kloudspeaker_FilesystemCommands {
	private $env;

	function __construct($env) {
		$this->env = $env;
	}

	public function initialize() {
		$this->env->commands()->register("filesystem:copy", $this);
		$this->env->commands()->register("filesystem:upload", $this);
	}

	public function execute($cmd, $commands, $options) {
		if (strcasecmp($cmd, "copy") == 0) {
			$this->processCopy($options);
		} else if (strcasecmp($cmd, "upload") == 0) {
			$this->processUpload($options);
		}
	}

	// COMMANDS

	private function processUpload($opts) {
		$ctx = array(
			"src" => isset($opts["src"]) ? $opts["src"] : NULL,
			"target" => isset($opts["target"]) ? $opts["target"] : NULL,
			"name" => isset($opts["name"]) ? $opts["name"] : NULL,
		);

		if (!$ctx["src"]) {
			echo "UPLOAD: src missing\n";
			return;
		}

		//validate target
		if (!$ctx["target"]) {
			echo "UPLOAD: target missing\n";
			return;
		}
		if (!strpos($ctx["target"], ":/")) {
			echo "UPLOAD: target not right format: \"[FID]:[PATH]/\"\n";
			return;
		}
		if (substr($ctx["target"], -1) != "/") {
			// make sure path is folder path
			$ctx["target"] = $ctx["target"] . "/";
		}

		// validate src
		if (!file_exists($ctx["src"]) or !is_file($ctx["src"])) {
			echo "UPLOAD: src does not exist: " . $ctx["src"] . "\n";
			return;
		}
		if (!is_file($ctx["src"])) {
			echo "UPLOAD: src is not a file: " . $ctx["src"] . "\n";
			return;
		}
		echo "UPLOAD: " . Util::array2str($ctx) . "\n";

		$name = basename($ctx["src"]);
		if ($ctx["name"] != NULL) {
			$name = $ctx["name"];
		}

		$target = $this->env->filesystem()->itemWithLocation($ctx["target"], TRUE);
		if (!$target->exists()) {
			echo "UPLOAD: target folder does not exist: " . $ctx["target"] . "\n";
			return;
		}
		if ($target->isFile()) {
			echo "UPLOAD: target is not a folder: " . $ctx["target"] . "\n";
			return;
		}
		if ($target->fileExists($name)) {
			echo "UPLOAD: target (" . $ctx["target"] . ") already has a file with name \"" . $name . "\"\n";
			return;
		}

		$content = fopen($ctx["src"], "rb");
		if (!$content) {
			echo "UPLOAD: could not read source file: " . $ctx["src"] . "\n";
			return;
		}
		$created = $this->env->filesystem()->createFile($target, $name, $content);
		fclose($content);

		echo "UPLOAD: file uploaded successfully into " . $created->internalPath() . "\n";
	}

	private function processCopy($opts) {
		$ctx = array(
			"src" => isset($opts["src"]) ? $opts["src"] : NULL,
			"target" => isset($opts["target"]) ? $opts["target"] : NULL,
			"name" => isset($opts["name"]) ? $opts["name"] : NULL,
		);

		if (!$ctx["src"]) {
			echo "COPY: src missing\n";
			return;
		}

		//validate target
		if (!$ctx["target"]) {
			echo "COPY: target missing\n";
			return;
		}
		if (!strpos($ctx["target"], ":/")) {
			echo "COPY: target not right format: \"[FID]:[PATH]/\"\n";
			return;
		}
		if (substr($ctx["target"], -1) != "/") {
			// make sure path is folder path
			$ctx["target"] = $ctx["target"] . "/";
		}

		// validate src
		if (!file_exists($ctx["src"]) or !is_file($ctx["src"])) {
			echo "COPY: src does not exist: " . $ctx["src"] . "\n";
			return;
		}
		if (!is_file($ctx["src"])) {
			echo "COPY: src is not a file: " . $ctx["src"] . "\n";
			return;
		}
		echo "COPY: " . Util::array2str($ctx) . "\n";

		$name = basename($ctx["src"]);
		if ($ctx["name"] != NULL) {
			$name = $ctx["name"];
		}

		$target = $this->env->filesystem()->itemWithLocation($ctx["target"], TRUE);
		if (!$target->exists()) {
			echo "COPY: target folder does not exist: " . $ctx["target"] . "\n";
			return;
		}
		if ($target->isFile()) {
			echo "COPY: target is not a folder: " . $ctx["target"] . "\n";
			return;
		}
		if ($target->fileExists($name)) {
			echo "COPY: target (" . $ctx["target"] . ") already has a file with name \"" . $name . "\"\n";
			return;
		}
		$created = $target->fileWithName($name);

		copy($ctx["src"], $created->internalPath());

		echo "COPY: file copied successfully into " . $created->internalPath() . "\n";
	}
}
?>