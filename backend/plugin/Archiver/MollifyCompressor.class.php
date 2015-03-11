<?php

/**
 * kloudspeakerCompressor.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

interface kloudspeakerCompressor {
	function acceptFolders();

	function add($name, $path, $size = 0);

	function addEmptyDir($name);

	function finish();

	function stream();

	function filename();
}
?>