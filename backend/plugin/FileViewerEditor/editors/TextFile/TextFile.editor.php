<?php
	class TextFileEditor extends FullEditor {
		protected function getHtml($item) {
			$html = '<textarea id="text-editor" style="width:100%;height:100%">';
			
			// read file			
			$stream = $item->read();
			while (!feof($stream))
				$html .= fread($stream, 1024);
			fclose($stream);
			
			return $html.'</textarea>';
		}

		protected function getDataJs() {
			return "return $('#text-editor').val();";
		}		
	}
?>