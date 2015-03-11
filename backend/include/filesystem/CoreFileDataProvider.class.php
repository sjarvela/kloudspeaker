<?php

/**
 * CoreFileDataProvider.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class CoreFileDataProvider {
	private $env;

	public function __construct($env) {
		$this->env = $env;
	}

	public function init($c) {
		$c->registerDataRequestPlugin(array("core-file-modified"), $this);
	}

	public function getRequestData($parent, $items, $key, $requestData) {
		$result = array();
		if (strcmp("core-file-modified", $key) === 0) {
			foreach ($items as $i) {
				$result[$i->id()] = $this->env->configuration()->formatTimestampInternal($i->lastModified());

			}
		}

		return $result;
	}

	public function __toString() {
		return "CoreFileDataProvider";
	}
}
?>