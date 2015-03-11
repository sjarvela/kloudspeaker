<?php

/**
 * ImagePreviewer.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ImagePreviewer extends PreviewerBase {
	public function getPreviewHtml($item) {
		return
		'<div id="file-preview-container" class="image-previewer-container">' .
		'<img src="' . $this->getImageContentUrl($item) . '" />' .
		'</div>';
	}

	private function getImageContentUrl($item) {
		return $this->env->getServiceUrl("filesystem", array($item->id(), "thumbnail"), TRUE);
	}
}
?>