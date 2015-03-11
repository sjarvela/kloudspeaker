<?php

/**
 * MollifyZipRaw.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

@include_once 'zip.lib.php';

class MollifyZipRaw implements MollifyCompressor {
	private $env;
	private $name;
	private $zip;

	function __construct($env) {
		$this->env = $env;
		$this->name = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . uniqid('Mollify', true) . 'zip';
		$this->zip = new zipfile();
	}

	public function acceptFolders() {
		return false;
	}

	public function add($name, $path, $size = 0) {
		if (is_file($path)) {
			$this->zip->addFile(file_get_contents($path), $name);
		} else if (is_dir($path)) {
			$contents = scandir($path);
			$bad = array(".", "..", ".DS_Store", "_notes", "Thumbs.db");
			$files = array_values(array_diff($contents, $bad));

			for ($i = 0; $i < count($files); $i++) {
				$this->add($name . DIRECTORY_SEPARATOR . $files[$i], $size, $path . DIRECTORY_SEPARATOR . $files[$i]);
			}
		}
	}

	public function addEmptyDir($name) {
		//TODO
	}

	public function finish() {
		file_put_contents($this->name, $this->zip->file());
	}

	public function stream() {
		if (!file_exists($this->name)) {
			return 0;
		}

		$handle = @fopen($this->name, "rb");
		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open zip for reading: " . $this->name);
		}

		return $handle;
	}

	public function filename() {
		return $this->name;
	}
}
?>