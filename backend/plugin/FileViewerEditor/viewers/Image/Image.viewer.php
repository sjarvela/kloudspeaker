<?php

	/**
	 * Image.viewer.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class ImageViewer extends EmbeddedContentViewer {
		protected function getHtml($item, $full) {
			return '<img src="'.$this->getContentUrl($item).'">';
		}
	}
?>