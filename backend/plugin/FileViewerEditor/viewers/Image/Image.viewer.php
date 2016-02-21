<?php

	/**
	 * Image.viewer.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class ImageViewer extends EmbeddedContentViewer {
		protected function getHtml($item, $full) {
			return '<img src="'.$this->getContentUrl($item).'">';
		}

		protected function getContentType() {
			return "image";
		}
	}
?>