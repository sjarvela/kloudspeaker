<?php
	class CKEditorEditor extends FullEditor {
		protected function getHead($item) {
			$resourceUrl = $this->getResourceUrl();
			return '
				<script type="text/javascript" src="'.$resourceUrl.'ckeditor.js"></script>
				<script type="text/javascript" src="'.$resourceUrl.'adapters/jquery.js"></script>
				<script type="text/javascript" src="'.$resourceUrl.'kloudspeaker.js"></script>
			';
		}
		
		protected function getHtml($item) {
			$html = '<div id="ckeditor-content" style="width:100%;height:100%"><textarea id="ckeditor">';
			
			// read file			
			$stream = $item->read();
			while (!feof($stream))
				$html .= htmlspecialchars(fread($stream, 1024));
			fclose($stream);
			
			return $html.'</textarea></div>';
		}

		protected function getDataJs() {
			return "return $('#ckeditor').val();";
		}		
	}
?>