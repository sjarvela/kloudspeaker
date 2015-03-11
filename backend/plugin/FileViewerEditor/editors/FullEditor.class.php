<?php

	/**
	 * FullEditor.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	abstract class FullEditor extends EditorBase {
		public function getInfo($item) {
			$url = $this->getUrl($item, "editor", TRUE);
			return array(
				"embedded" => $url,
				"full" => $url
			);
		}
		
		public function processRequest($item, $path) {
			if ($path[0] === 'editor')
				$this->processEditorRequest($item);
			else
				throw $this->invalidRequestException();
		}

		protected function processEditorRequest($item) {
			$html = '<html>
				<head>
					<title>'.$item->name().'</title>
					<meta content="text/html; charset=utf-8" http-equiv="content-type" />
					<script type="text/javascript" src="'.$this->getCommonResourcesUrl().'jquery-1.4.2.min.js"></script>
					<script type="text/javascript" src="'.$this->getCommonResourcesUrl().'json.js"></script>
					'.$this->getHead($item).'
					<script>
						function onEditorSave(s, e) {
							var data = getSaveContent();
							$.ajax({
								type: "POST",
								processData: false,
								contentType: "text/plain",
								url: "'.$this->getServiceUrl("filesystem", array($item->id(), 
"content"), TRUE).'",
								data: data,
								success: function(result) {
									s();
								},
								error: function(xhr, desc, exc) {
									var errorText = xhr.responseText;
									var error;
									
									if (!errorText) error = {code:999, error:"Unknown error", details:"Request failed, no response received"};
									else if (errorText.substr(0, 1) != "{") error = {code:999, error:"Unknown error", details:"Invalid response received: " + errorText};
									else error = JSON.parse(errorText);

									e(error.code, error.error);
								}
							});
						}
						
						function getSaveContent() {
						'.$this->getDataJs().'
						}
					</script>
				</head>
				<body>'.$this->getHtml($item).'
				</body>
			</html>';
			
			$this->response()->html($html);
		}
		
		protected function getHead($item) { return ""; }
		
		protected abstract function getHtml($item);
		
		protected abstract function getDataJs();
	}
?>