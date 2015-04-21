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
		if (count($this->path) != 1 or !in_array($this->path[0], array("data", "restore", "delete"))) {
			throw $this->invalidRequestException();
		}

		// DATA
		if ($this->path[0] == "data") {
			//TODO path
			$items = $this->trashBinManager()->getTrashItems();
			$this->response()->success(array("items" => $items, "data" => array()));
			return;
		}

		//DELETE or RESTORE
		$data = $this->request->data;
		if (!array_key_exists("items", $data) or !is_array($this->request->data["items"])) {
			throw $this->invalidRequestException();
		}

		$items = $this->request->data["items"];
		if (count($items) == 0) {
			throw $this->invalidRequestException();
		}

		if ($this->path[0] == "delete") {
			$this->trashBinManager()->deleteItems($items);
			$this->response()->success(array());
			return;
		} else if ($this->path[0] == "restore") {
			$this->trashBinManager()->restoreItems($items);
			$this->response()->success(array());
			return;
		}
		throw $this->invalidRequestException();
	}

	private function trashBinManager() {
		return $this->env->plugins()->getPlugin("TrashBin")->getTrashBinManager();
	}

	public function __toString() {
		return "TrashBinServices";
	}
}
?>