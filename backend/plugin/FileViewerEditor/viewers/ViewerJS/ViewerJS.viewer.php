<?php

/**
 * ViewerJS.viewer.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ViewerJSViewer extends EmbeddedContentViewer {
	protected function getHtml($item, $full) {
		$resourceUrl = $this->getResourceUrl();
		return '<iframe id="viewerjs-content" src = "'.$resourceUrl.'/ViewerJS/#' . $this->getContentUrl($item) . '" />';
	}

	protected function getEmbeddedSize() {
		return array("600", "400");
	}

	protected function getResizedElementId() {
		return "viewerjs-content";
	}
}
?>