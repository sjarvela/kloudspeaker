<?php
	class VlcViewer extends EmbeddedContentViewer {
		protected function getEmbeddedSize() {
			return array("640", "480");
		}
		
		protected function getResizedElementId() {
			return "vlcplayer";
		}
		
		protected function getHtml($item, $full) {
			return '<embed type="application/x-vlc-plugin" pluginspage="http://www.videolan.org" version="VideoLAN.VLCPlugin.2" width="580" height="380" src="'.$this->getContentUrl($item).'"></embed>';
		}		
	}
?>