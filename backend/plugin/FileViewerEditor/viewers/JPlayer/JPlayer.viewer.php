<?php
class JPlayerViewer extends FullDocumentViewer {
	protected function getEmbeddedSize() {
		return array("450", "150");
	}

	protected function getHtml($item, $full) {
		$resourceUrl = $this->getResourceUrl();

		$head =
		'<script type="text/javascript" src="' . $this->env->getCommonResourcesUrl() . 'jquery-1.4.2.min.js"></script>' .
		'<script type="text/javascript" src="' . $resourceUrl . 'jquery.jplayer.min.js"></script>' .
		'<link href="' . $resourceUrl . 'jplayer.blue.monday.css" rel="stylesheet" type="text/css" />' .
		'<script>
					$(document).ready( function() {
						$("#jquery_jplayer_1").jPlayer( {
							ready: function () {
								$(this).jPlayer("setMedia", {
									' . (is_array($item) ? $item["extension"] : $item->extension()) . ':"' . $this->getContentUrl($item) . '"
								}).jPlayer("play");
							},
							solution: "html, flash",
							swfPath: "' . $resourceUrl . '",
							errorAlerts:false,
							warningAlerts:false,
							supplied: "' . (is_array($item) ? $item["extension"] : $item->extension()) . '"
						});
					});
				</script>';

		$html =
		'<div id="jquery_jplayer_1" class="jp-jplayer"></div>

				<div class="jp-audio">
					<div class="jp-type-single">
						<div id="jp_interface_1" class="jp-interface">
							<ul class="jp-controls">
								<li><a href="#" class="jp-play" tabindex="1">play</a></li>
								<li><a href="#" class="jp-pause" tabindex="1">pause</a></li>
								<li><a href="#" class="jp-stop" tabindex="1">stop</a></li>
								<li><a href="#" class="jp-mute" tabindex="1">mute</a></li>
								<li><a href="#" class="jp-unmute" tabindex="1">unmute</a></li>
							</ul>
							<div class="jp-progress">
								<div class="jp-seek-bar">
									<div class="jp-play-bar"></div>
								</div>
							</div>
							<div class="jp-volume-bar">
								<div class="jp-volume-bar-value"></div>
							</div>
							<div class="jp-current-time"></div>
							<div class="jp-duration"></div>
						</div>
						<div id="jp_playlist_1" class="jp-playlist">
							<ul>
								<li>' . (is_array($item) ? $item["name"] : $item->name()) . '</li>
							</ul>
						</div>
					</div>
				</div>';

		return "<html><head><title>" . (is_array($item) ? $item["name"] : $item->name()) . "</title>" . $head . "</head><body>" . $html . "</body></html>";
	}
}
?>