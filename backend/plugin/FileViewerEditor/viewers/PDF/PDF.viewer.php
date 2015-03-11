<?php

/**
 * PDF.viewer.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class PDFViewer extends EmbeddedContentViewer {
	protected function getHtml($item, $full) {
		return '<img src="' . $this->getContentUrl($item) . '">';
	}

	public function getContentUrl($item) {
		return $this->getDataUrl($item, "content");
	}

	public function processDataRequest($item, $path) {
		if (count($path) != 1) {
			throw $this->invalidRequestException();
		}

		if ($path[0] === 'content') {
			$this->convert($item, 1); //TODO page
		} else {
			parent::processDataRequest($item, $path);
		}
	}

	private function convert($item, $page) {
		$im = new Imagick($item->internalPath() . '[' . ($page - 1) . ']');
		$im->setResolution(1600, 1600);
		$im->setImageFormat('jpg');
		header('Content-Type: image/jpeg');
		echo $im;
		die();
	}
}
?>