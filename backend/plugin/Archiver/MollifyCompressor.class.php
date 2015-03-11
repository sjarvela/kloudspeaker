<?php

/**
 * MollifyCompressor.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

interface MollifyCompressor {
	function acceptFolders();

	function add($name, $path, $size = 0);

	function addEmptyDir($name);

	function finish();

	function stream();

	function filename();
}
?>