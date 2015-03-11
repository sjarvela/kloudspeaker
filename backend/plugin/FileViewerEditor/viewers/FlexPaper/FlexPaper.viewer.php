<?php
	/**
	 * FlexPaper viewer uses FlexPaper by Devaldi Ltd.
	 *
	 * Visit http://flexpaper.devaldi.com/download.jsp for terms of use or licensing information.
	 *
	 */
	 
	 class FlexPaperViewer extends FullDocumentViewer {		
		protected function getEmbeddedSize() {
			return array("450", "150");
		}
		
		protected function getHtml($item, $full) {
			$resourceUrl = $this->getResourceUrl();
			
			$head =
				'<meta http-equiv="Content-Type" content="text/html; charset=utf-8" /> 
		        <style type="text/css" media="screen"> 
					html, body	{ height:100%; }
					body { margin:0; padding:0; overflow:auto; }   
					#flashContent { display:none; }
		        </style>
		        <script type="text/javascript" src="'.$resourceUrl.'js/flexpaper_flash.js"></script>';

			$html =
				'<div style="position:absolute;left:10px;top:10px;">
	        <a id="viewerPlaceHolder" style="width:680px;height:480px;display:block"></a>
	        
	        <script type="text/javascript"> 
				var fp = new FlexPaperViewer(	
						 "../FlexPaperViewer",
						 "viewerPlaceHolder", { config : {
						 SwfFile : "'.$resourceUrl.'Paper.swf",
						 Scale : 0.6, 
						 ZoomTransition : "easeOut",
						 ZoomTime : 0.5,
						 ZoomInterval : 0.2,
						 FitPageOnLoad : true,
						 FitWidthOnLoad : false,
						 FullScreenAsMaxWindow : false,
						 ProgressiveLoading : false,
						 MinZoomSize : 0.2,
						 MaxZoomSize : 5,
						 SearchMatchAll : false,
						 InitViewMode : "SinglePage",
						 
						 ViewModeToolsVisible : true,
						 ZoomToolsVisible : true,
						 NavToolsVisible : true,
						 CursorToolsVisible : true,
						 SearchToolsVisible : true,
  						
  						 localeChain: "en_US"
						 }});
	        </script>
        </div>';

			return "<html><head><title>".$item->name()."</title>".$head."</head><body>".$html."</body></html>";
		}
	}
?>