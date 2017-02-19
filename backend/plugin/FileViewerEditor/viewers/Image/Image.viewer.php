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

		public function handleItemContent($item) {
			// convert tiff to png
			if (strcasecmp($item->extension(), 'tiff') === 0) {
				$ig = $this->env->env()->imageGenerator();
				if ($ig->isTypeSupported('tiff')) {
					$ig->convertToPng($item->internalPath(), 'tiff', TRUE);
					return TRUE;
				}
			}
			
			return FALSE;
		}
	}
?>