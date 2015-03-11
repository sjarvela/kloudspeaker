<?php

/**
 * ArchiveManager.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ArchiveManager {
	private $env;
	private $compressor;
	private $settings;

	function __construct($env, $compressor, $settings) {
		$this->env = $env;
		$this->compressor = $compressor;
		$this->settings = $settings;
	}

	/*public function storeArchive($items) {
	$id = uniqid();
	$zip = $this->createArchive($items);
	$this->env->session()->param("archive_".$id, $zip->filename());
	return $id;
	}*/

	public function getActions() {
		return array("compress", "download", "extract");
	}

	public function isActionEnabled($action) {
		if (!in_array($action, $this->getActions())) {
			return FALSE;
		}

		return $this->getSetting("enable_" . $action, TRUE);
	}

	private function createArchive($items) {
		$c = $this->getCompressor();

		if (is_array($items)) {
			$this->env->filesystem()->assertRights($items, FilesystemController::PERMISSION_LEVEL_READ, "add to package");

			foreach ($items as $item) {
				$item->addTo($c);
			}
		} else {
			$item = $items;
			$this->env->filesystem()->assertRights($item, FilesystemController::PERMISSION_LEVEL_READ, "add to package");
			$item->addTo($c);
		}

		$c->finish();
		return $c;
	}

	public function extract($archive, $to) {
		$zip = new ZipArchive;
		if ($zip->open($archive) !== TRUE) {
			throw new ServiceException("REQUEST_FAILED", "Could not open archive " . $archive);
		}

		$zip->extractTo($to);
		$zip->close();
	}

	public function compress($items, $to = NULL) {
		$a = $this->createArchive($items);

		if ($to != NULL) {
			$from = $a->filename();
			copy($from, $to);
			unlink($from);
		} else {
			return $a->filename();
		}
	}

	private function getCompressor() {
		require_once 'KloudspeakerCompressor.class.php';

		if ($this->compressor == NULL || strcasecmp($this->compressor, "ziparchive") === 0) {
			require_once 'zip/KloudspeakerZipArchive.class.php';
			return new KloudspeakerZipArchive($this->env);
		} else if (strcasecmp($this->compressor, "native") === 0) {
			require_once 'zip/KloudspeakerZipNative.class.php';
			return new KloudspeakerZipNative($this->env);
		} else if (strcasecmp($this->compressor, "raw") === 0) {
			require_once 'zip/KloudspeakerZipRaw.class.php';
			return new KloudspeakerZipRaw($this->env);
		}

		throw new ServiceException("INVALID_CONFIGURATION", "Unsupported compressor configured: " . $this->compressor);
	}

	public function getSetting($name, $default = NULL) {
		if (!$this->settings or !isset($this->settings[$name])) {
			return $default;
		}

		return $this->settings[$name];
	}

	public function __toString() {
		return "ArchiverManager";
	}
}
?>