<?php

	/**
	 * SVG.viewer.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class SVGViewer extends EmbeddedContentViewer {
		protected function getHtml($item, $full) {
			return '<object data="' . $this->getContentUrl($item) . '" type="image/svg+xml"></object>';
		}

		protected function getContentType() {
			return "object/svg";
		}
	}
?>