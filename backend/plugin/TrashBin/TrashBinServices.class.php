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
		if (count($this->path) != 1 or !in_array($this->path[0], array("users"))) {
			throw $this->invalidRequestException();
		}
		if (!$this->env->authentication()->isAdmin()) {
			throw $this->invalidRequestException();
		}

		$this->response()->success(array());
	}

	public function processPost() {
		if (count($this->path) != 1 or !in_array($this->path[0], array("data", "restore", "delete", "empty"))) {
			throw $this->invalidRequestException();
		}

		// DATA
		if ($this->path[0] == "data") {
			//TODO path
			$result = $this->trashBinManager()->getTrashItems();
			$this->response()->success($result);
			return;
		}

		//EMPTY
		if ($this->path[0] == "empty") {
			$this->trashBinManager()->deleteAllItems();
			$this->response()->success(array());
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
			$result = $this->trashBinManager()->restoreItems($items);

			if (array_key_exists("restored", $result)) {
				$this->trashBinManager()->checkExpired();

				$this->response()->success($result["restored"]);
			} else {
				$this->response()->error(array(201, "Restore failed"), $result);
			}

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