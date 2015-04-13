<?php

/**
 * TrashBinServices.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under Commercial Plugin License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class TrashBinServices extends ServicesBase {
	protected function isValidPath($method, $path) {
		return count($path) > 0;
	}

	public function isAuthenticationRequired() {
		return TRUE;
	}

	public function processGet() {
		$this->response()->success(array());
	}

	public function processPost() {
		if (count($this->path) != 1 and (strcmp($this->path[0], 'data') != 0)) {
			throw $this->invalidRequestException();
		}
		$userItems = $this->trashBinManager()->getUserTrashItems();
		$this->response()->success(array("items" => $userItems, "data" => array()));
	}

	private function trashBinManager() {
		return $this->env->plugins()->getPlugin("TrashBin")->getTrashBinManager();
	}

	public function __toString() {
		return "TrashBinServices";
	}
}
?>