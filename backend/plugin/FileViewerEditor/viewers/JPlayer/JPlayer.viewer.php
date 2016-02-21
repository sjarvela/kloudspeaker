<?php
class JPlayerViewer extends FullDocumentViewer {
	protected function getEmbeddedSize() {
		return array("450", "150");
	}

	protected function getHtml($item, $full) {
		$resourceUrl = $this->getResourceUrl();

		$head =
		'<script type="text/javascript" src="' . $this->env->getCommonResourcesUrl() . 'jquery-1.4.2.min.js"></script>' .
		'<script type="text/javascript" src="' . $resourceUrl . 'jplayer/jquery.jplayer.min.js"></script>' .
		'<link href="' . $resourceUrl . '/skin/blue.monday/css/jplayer.blue.monday.min.css" rel="stylesheet" type="text/css" />' .
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
			<div id="jp_container_1" class="jp-audio" role="application" aria-label="media player">

					<div class="jp-type-single">
						<div id="jp_interface_1" class="jp-gui jp-interface">
							<div class="jp-controls">
								<button class="jp-play" role="button" tabindex="0">play</button>
								<button class="jp-stop" role="button" tabindex="0">stop</button>
							</div>
							<div class="jp-progress">
								<div class="jp-seek-bar">
									<div class="jp-play-bar"></div>
								</div>
							</div>
							<div class="jp-volume-controls">
								<button class="jp-mute" role="button" tabindex="0">mute</button>
								<button class="jp-volume-max" role="button" tabindex="0">max volume</button>
								<div class="jp-volume-bar">
									<div class="jp-volume-bar-value"></div>
								</div>
							</div>
							<div class="jp-time-holder">
								<div class="jp-current-time" role="timer" aria-label="time">&nbsp;</div>
								<div class="jp-duration" role="timer" aria-label="duration">&nbsp;</div>
								<div class="jp-toggles">
									<button class="jp-repeat" role="button" tabindex="0">repeat</button>
								</div>
							</div>
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