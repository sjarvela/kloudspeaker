<?php
	class FlowPlayerViewer extends FullDocumentViewer {		
		protected function getHtml($item, $full) {
			$resourceUrl = $this->getResourceUrl();
			
			$head = '<script type="text/javascript" src="'.$resourceUrl.'flowplayer-3.1.4.min.js"></script>';					
			$html =
				'<a href="'.$this->getContentUrl($item).'" style="display:block;width:580px;height:380px" id="player"></a>'.
				'<script>flowplayer("player", "'.$resourceUrl.'flowplayer-3.1.5.swf");</script>';

			return "<html><head><title>".$item->name()."</title>".$head."</head><body>".$html."</body></html>";
		}
	}
?>