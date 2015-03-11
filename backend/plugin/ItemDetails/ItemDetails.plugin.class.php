<?php

/**
 * ItemDetails.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ItemDetails extends PluginBase {
	private $detailProviders = array();

	public function setup() {
		foreach ($this->getSettings() as $p) {
			$this->initProvider($p);
		}

		$this->env->filesystem()->registerItemContextPlugin("plugin-itemdetails", $this);
	}

	private function initProvider($p) {
		$cls = "providers/" . $p . ".class.php";
		$path = dirname(__FILE__) . DIRECTORY_SEPARATOR . $cls;
		if (!file_exists($path)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Provider not found: " . $p);
		}

		require_once $cls;
		$provider = new $p();
		$this->registerDetailsProvider($p->getDataKeys(), $p);
	}

	public function registerDetailsProvider($keys, $p) {
		if (is_array($keys)) {
			foreach ($keys as $k) {
				$this->detailProviders[$k] = $p;
			}
		} else {
			$this->detailProviders[$keys] = $p;
		}
	}

	public function getItemContextData($item, $details, $k, $data) {
		if (!$data) {
			return FALSE;
		}

		$result = array();
		foreach ($data as $key) {
			$result[$key] = $this->getData($item, $key);
		}

		return $result;
	}

	private function getData($item, $key) {
		if (strcmp($key, "name") === 0) {
			return $item->name();
		}

		if (strcmp($key, "path") === 0) {
			return $item->path();
		}

		if (strcmp($key, "size") === 0) {
			return $item->isFile() ? $item->size() : NULL;
		}

		if (strcmp($key, "extension") === 0) {
			return $item->isFile() ? $item->extension() : NULL;
		}

		if (strcmp($key, "last-modified") === 0) {
			return $this->env->configuration()->formatTimestampInternal($item->lastModified());
		}

		if (strcmp($key, "metadata-created") === 0) {
			return $this->env->filesystem()->getCreatedMetadataInfo($item);
		}

		if (strcmp($key, "image-size") === 0) {
			if (!$item->exists()) {
				return "0x0";
			}

			$filesize = $item->size();
			if ($filesize == NULL or $filesize == 0) {
				return "0x0";
			}

			$size = getimagesize($item->internalPath());
			return $size == NULL ? NULL : $size[0] . "x" . $size[1];
		}
		if (strcmp($key, "exif") === 0) {
			return $this->getExif($item);
		}

		if (array_key_exists($key, $this->detailProviders)) {
			$provider = $this->detailProviders[$key];
			return $provider->getDetail($item, $key);
		}
		return NULL;
	}

	public function getExif($item) {
		if (!$item->exists() or $item->size() == NULL or $item->size() == 0) {
			return NULL;
		}

		$exif = exif_read_data($item->internalPath(), 0, true);
		if (!$exif) {
			return NULL;
		}

		return Util::convertArrayCharset($exif);
	}

	public function __toString() {
		return "ItemDetailsPlugin";
	}
}
?>
