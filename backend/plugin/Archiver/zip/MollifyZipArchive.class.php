<?php

/**
 * kloudspeakerZipArchive.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class kloudspeakerZipArchive implements kloudspeakerCompressor {
	private $env;
	private $name;
	private $zip;

	function __construct($env) {
		if (!class_exists('ZipArchive')) {
			throw new ServiceException("INVALID_CONFIGURATION", "ZipArchive lib not installed");
		}

		$this->env = $env;
		$this->name = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . uniqid('kloudspeaker', true) . 'zip';
		$this->zip = new ZipArchive();
		if ($this->zip->open($this->name, ZIPARCHIVE::CREATE) !== TRUE) {
			throw new ServiceException("REQUEST_FAILED", "Could not create zip " . $this->name);
		}
	}

	public function acceptFolders() {
		return FALSE;
	}

	public function add($name, $path, $size = 0) {
		$this->zip->addFile($path, $name);
	}

	public function addEmptyDir($name) {
		$this->zip->addEmptyDir($name);
	}

	public function finish() {
		$this->zip->close();
	}

	public function stream() {
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