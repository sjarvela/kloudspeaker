<?php
	class FlowPlayerViewer extends FullDocumentViewer {		
		protected function getHtml($item, $full) {
			$resourceUrl = $this->getResourceUrl();
			
			$head = '<link rel="stylesheet" href="'.$resourceUrl.'/flowplayer-6.0.3/skin/functional.css"><script src="'.$resourceUrl.'/jquery-1.11.2.min.js"></script><script type="text/javascript" src="'.$resourceUrl.'/flowplayer-6.0.3/flowplayer.min.js"></script>
<style>
	.flowplayer .fp-embed { display: none; }
</style>';

			$html = '
<div class="player" style="display:block;">
   <video>
      <source type="video/webm" src="'.$this->getContentUrl($item).'">
   </video>
</div>
 
<script>
$(function () {
   $(".player").flowplayer();
});
</script>';

			return "<!DOCTYPE html><html><head><title>".$item->name()."</title>".$head."</head><body>".$html."</body></html>";
		}
	}
?>