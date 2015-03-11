<?php

	/**
	 * Direct.viewer.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	 
	 class DirectViewer extends ViewerBase {		
		protected function getEmbeddedSize() {
			return array("450", "150");
		}
		
		public function getInfo($item) {
			return array(
				"embedded" => $this->getDataUrl($item, "embedded"),
				"full" => $this->getContentUrl($item)
			);
		}
		
		public function processDataRequest($item, $path) {
			if (count($path) != 1 and $path[0] != 'embedded') throw $this->invalidRequestException();
			
			$html = '<iframe id="direct-viewer" src="'.$this->getContentUrl($item).'" style="border: none;"></iframe>';			
			$this->response()->success(array(
				"html" => $html,
				"resized_element_id" => "direct-viewer",
				"size" => "600;400"
			));
		}
	}
?>