<?php

/**
 * ItemCollectionServices.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class ItemCollectionServices extends ServicesBase {

	protected function isValidPath($method, $path) {
		return TRUE;
	}

	public function isAuthenticationRequired() {
		return TRUE;
	}

	public function processGet() {
		if (count($this->path) > 1) {
			throw $this->invalidRequestException();
		}

		if (count($this->path) == 1) {
			$this->response()->success($this->convertCollection($this->handler()->getUserItemCollection($this->path[0])));
		} else {
			$this->response()->success($this->convert($this->handler()->getUserItemCollections()));
		}
	}

	private function convert($collections) {
		$result = array();
		foreach ($collections as $c) {
			$result[] = $this->convertCollection($c);
		}

		return $result;
	}

	private function convertCollection($c) {
		return array("id" => $c["id"], "name" => $c["name"], "items" => $this->convertItems($c["id"], $c["items"]));
	}

	private function convertItems($id, $items) {
		$result = array();
		if (!$items or $items == NULL) {
			return $result;
		}

		$missing = array();
		foreach ($items as $itemId) {
			$i = $this->env->filesystem()->item($itemId);

			if (!$i->exists()) {
				$missing[] = array("id" => $i->id());
				continue;
			}
			$result[] = $i->data();
		}

		if (count($missing) > 0) {
			Logging::logDebug("Items missing, removing: " . count($missing));
			$this->handler()->removeCollectionItems($id, $missing);
		}

		return $result;
	}

	private function getItems($ids) {
		$result = array();
		if ($ids == NULL or count($ids) == 0) {
			return $result;
		}

		foreach ($ids as $itemId) {
			$i = $this->env->filesystem()->item($itemId);

			if (!$i->exists()) {
				continue;
			}
			$result[] = $i;
		}

		return $result;
	}

	public function processDelete() {
		if (count($this->path) > 2) {
			throw $this->invalidRequestException();
		}

		$id = $this->path[0];
		if (count($this->path) == 2) {
			if (strcmp("items", $this->path[1]) != 0) {
				throw $this->invalidRequestException();
			}

			$data = $this->request->data;
			if (!isset($data["items"])) {
				throw $this->invalidRequestException("No data");
			}

			$items = $data["items"];

			$this->handler()->removeCollectionItems($id, $items);
			$this->response()->success(array());
			return;
		}
		$this->handler()->deleteUserItemCollection($id);
		$this->response()->success($this->convert($this->handler()->getUserItemCollections()));
	}

	public function processPost() {
		if (count($this->path) > 2) {
			throw $this->invalidRequestException();
		}

		$id = FALSE;
		$data = $this->request->data;

		if (count($this->path) == 0) {
			if (!isset($data["name"])) {
				throw $this->invalidRequestException("No data");
			}

			$name = $data["name"];
			if (strlen($name) == 0) {
				throw $this->invalidRequestException("Missing data");
			}

			if (!isset($data["items"])) {
				throw $this->invalidRequestException("No data");
			}

			$items = $data["items"];

			$this->handler()->addUserItemCollection($name, $items);
			$this->response()->success($this->convert($this->handler()->getUserItemCollections()));
			return;

		}

		$id = $this->path[0];

		// itemcollection/xx/data
		if (count($this->path) == 2) {
			if ($this->path[1] != "data") {
				throw $this->invalidRequestException();
			}

			$ic = $this->handler()->getUserItemCollection($id);
			$cc = $this->convertCollection($ic);

			$result = array(
				"ic" => $cc,
				"data" => $this->env->filesystem()->getRequestData(NULL, $this->getItems($ic["items"]), $data["rq_data"]),
			);
			$this->response()->success($result);
			return;
		}

		// itemcollection/xx/
		if (!isset($data["items"])) {
			throw $this->invalidRequestException("No data");
		}

		$items = $data["items"];
		if (!is_array($items) or count($items) == 0) {
			throw $this->invalidRequestException("Missing data");
		}

		$this->handler()->addCollectionItems($id, $items);
		$this->response()->success(array());
	}

	private function handler() {
		return $this->env->plugins()->getPlugin("ItemCollection")->getHandler();
	}
}
?>
