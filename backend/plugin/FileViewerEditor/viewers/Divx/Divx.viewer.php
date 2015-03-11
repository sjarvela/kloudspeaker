<?php
	class DivxViewer extends EmbeddedContentViewer {
		protected function getEmbeddedSize() {
			return array("640", "480");
		}
		
		protected function getResizedElementId() {
			return "divxplayer";
		}
		
		protected function getHtml($item, $full) {
			return '<object classid="clsid:67DABFBF-D0AB-41fa-9C46-CC0F21721616" width="580" height="380" codebase="http://go.divx.com/plugin/DivXBrowserPlugin.cab"><param name="loop" value="false" /><param name="autoplay" value="true">
<param name="src" value="'.$this->getContentUrl($item).'"><param name="target" value="myself">
<embed type="video/divx" target="myself" src="'.$this->getContentUrl($item).'" width="580" height="380" loop="false" autoplay="true" pluginspage="http://go.divx.com/plugin/download/"> </embed></object>';
		}		
	}
?>