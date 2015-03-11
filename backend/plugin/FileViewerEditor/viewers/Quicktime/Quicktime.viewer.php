<?php
	class QuicktimeViewer extends EmbeddedContentViewer {
		protected function getEmbeddedSize() {
			return array("640", "480");
		}
		
		protected function getResizedElementId() {
			return "quicktime-player";
		}

		protected function getHtml($item, $full) {
			$url = $this->getContentUrl($item);
			return '<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab" width="580" height="380"><param name="src" value="'.$url.'"><param name="autoplay" value="true"><param name="controller" value="true"><param name="scale" value="aspect"><param name=type value="video/quicktime" width="580" height="380"><embed id="quicktime-player" src="'.$url.'" autoplay="true" controller="true" scale="aspect" type="video/quicktime" width="580" height="380" pluginspage="http://www.apple.com/quicktime/download/"></object>';
		}
	}
?>
