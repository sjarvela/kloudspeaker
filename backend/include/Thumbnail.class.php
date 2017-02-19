<?php

/**
 * Thumbnail.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Thumbnail {
	private $enabled;
	private $imagick;

	function __construct($env) {
		$this->enabled = $env->settings()->setting("enable_thumbnails");
		$this->imagick = class_exists("Imagick");
	}

	public function getSupportedThumbnailTypes() {
		if (!$this->enabled) return array();

		$supported = array("gif", "png", "jpg", "jpeg");
		if ($this->imagick)
			$supported[] = "tiff";
		return $supported;
	}

	function generate($item, $maxWidth = 400, $maxHeight = 400) {
		if (!$this->enabled) return FALSE;

		$img = null;
		$gd = TRUE;
		$ext = $item->extension();

		if (strcasecmp('jpg', $ext) == 0 || strcasecmp('jpeg', $ext) == 0) {
			$img = @imagecreatefromjpeg($item->internalPath());
		} else if (strcasecmp('png', $ext) == 0) {
			$img = @imagecreatefrompng($item->internalPath());
		} else if (strcasecmp('gif', $ext) == 0) {
			$img = @imagecreatefromgif($item->internalPath());
		} else if ($this->imagick and strcasecmp('tiff', $ext) == 0) {
			$img = new Imagick();
			$img->readImage($item->internalPath());
			$gd = FALSE;
		}
		if ($img == NULL) {
			Logging::logDebug("Could not create thumbnail, format not supported");
			return FALSE;
		}

		if ($gd) {
			$w = imagesx($img);
			$h = imagesy($img);
			$s = min($maxWidth / $w, $maxHeight / $h);
			if ($s >= 1) {
				Logging::logDebug("Skipping thumbnail, image smaller than thumbnail");
				return FALSE;
			}

			$tw = floor($s * $w);
			$th = floor($s * $h);
			$thumb = imagecreatetruecolor($tw, $th);
			imagecopyresized($thumb, $img, 0, 0, 0, 0, $tw, $th, $w, $h);
			imagedestroy($img);
			if ($thumb == NULL) {
				Logging::logDebug("Failed to create thumbnail");
				return FALSE;
			}

			header("Content-type: image/jpeg");
			imagejpeg($thumb);
		} else {
			$w = $img->getImageWidth();
			$h = $img->getImageHeight();
			$s = min($maxWidth / $w, $maxHeight / $h);

			$tw = floor($s * $w);
			$th = floor($s * $h);

			$img->thumbnailImage($tw, $th, TRUE);
			$img->setImageFormat("png24");

			header("Content-type: image/png");
			echo $img;
			$img->clear();
			$img->destroy();
		}
		return TRUE;
	}
}
?>
