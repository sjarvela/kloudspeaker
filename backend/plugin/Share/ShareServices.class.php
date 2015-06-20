<?php

/**
 * ShareServices.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ShareServices extends ServicesBase {

	protected function isValidPath($method, $path) {
		return TRUE;
	}

	public function isAuthenticationRequired() {
		return TRUE;
	}

	public function processGet() {
		if (count($this->path) == 1) {
			// share/xxx : get single share by id
			$id = $this->path[0];

			if ($this->env->request()->hasParam("info")) {
				$this->response()->success($this->handler()->getShareInfo($id));
				return;
			}
			$this->response()->success($this->handler()->getShare($id));
			return;
		}

		if (strcmp($this->path[0], 'items') != 0 and strcmp($this->path[0], 'all') != 0) {
			throw $this->invalidRequestException();
		}

		if (strcmp($this->path[0], 'all') == 0) {
			if (count($this->path) > 2) {
				throw $this->invalidRequestException();
			}

			$shares = $this->handler()->getUserShares();
			$items = array();
			$invalid = array();
			$nonFs = array();
			foreach ($shares as $uk => $u) {
				foreach ($u as $ik => $i) {
					if (array_key_exists($ik, $items) || in_array($ik, $invalid)) {
						continue;
					}
					if (strpos($ik, "_") !== FALSE) {
						$parts = explode("_", $ik);
						$info = $this->handler()->getCustomShareInfo($parts[0], $parts[1], $i);
						if ($info == NULL) {
							continue;
						}

						$nonFs[] = array("id" => $ik, "type" => $parts[0], "name" => $info["name"]);
						continue;
					}

					$item = NULL;
					try {
						$item = $this->item($ik);
					} catch (ServiceException $se) {
						Logging::logError("Invalid share item: " . $ik);
						$invalid[] = $ik;
						$items[$ik] = array(
							"id" => $ik,
							"name" => "-",
						);
						continue;
					}
					if (!$item->exists()) {
						Logging::logError("Invalid share item (item does not exist): " . $ik);
						$invalid[] = $ik;
						$items[$ik] = array(
							"id" => $ik,
							"name" => "-",
						);
						continue;
					}
					$items[$ik] = $item->data();
				}
			}
			$this->response()->success(array("shares" => $shares, "items" => $items, "invalid" => $invalid, "nonfs" => $nonFs));
			return;
		}

		//share/items/xxx : item shares

		if (count($this->path) == 2) {
			$itemId = $this->path[1];
			if (strpos($itemId, "_") === FALSE) {
				$this->item($itemId);
			}

			$this->response()->success($this->handler()->getShares($itemId));
			return;
		}

		//share/items/xxx/options : item share options

		if (count($this->path) == 3 and strcmp($this->path[2], 'options') == 0) {
			$itemId = $this->path[1];
			$this->response()->success($this->handler()->getShareOptions($itemId));
			return;
		}
		throw $this->invalidRequestException();
	}

	public function processDelete() {
		if (count($this->path) > 2) {
			throw $this->invalidRequestException();
		}

		if ($this->path[0] == "items") {
			if (count($this->path) != 2) {
				throw $this->invalidRequestException();
			}

			$id = $this->path[1];
			$this->handler()->deleteSharesForItem($id);
			$this->response()->success(array());
		} else if ($this->path[0] == "list") {
			if (count($this->path) != 1) {
				throw $this->invalidRequestException();
			}

			if (!isset($this->request->data["list"]) or !is_array($this->request->data["list"])) {
				throw $this->invalidRequestException();
			}

			$this->handler()->deleteShares($this->request->data["list"]);
			$this->response()->success(array());
		} else {
			if (count($this->path) != 1) {
				throw $this->invalidRequestException();
			}

			$id = $this->path[0];
			$this->handler()->deleteShare($id);
			$this->response()->success(array());
		}
	}

	public function processPost() {
		if (count($this->path) > 1) {
			throw $this->invalidRequestException();
		}

		$data = $this->request->data;

		if (count($this->path) == 1 and $this->path[0] == "query") {
			$this->env->authentication()->assertAdmin();
			$res = $this->handler()->processShareQuery($data);
			$items = array();
			$invalid = array();
			$nonFs = array();
			foreach ($res["data"] as $s) {
				$s["active"] = ($s["active"] == "1");

				//process item
				$ik = $s["item_id"];
				if (array_key_exists($ik, $items) || in_array($ik, $invalid)) {
					continue;
				}
				if (strpos($ik, "_") !== FALSE) {
					$s["nonfs"] = TRUE;

					$parts = explode("_", $ik);
					$info = $this->handler()->getCustomShareInfo($parts[0], $parts[1], $s);
					if ($info == NULL) {
						continue;
					}

					$nonFs[] = array("id" => $ik, "type" => $parts[0], "name" => $info["name"]);
					continue;
				}

				$item = NULL;
				try {
					$item = $this->item($ik);
				} catch (ServiceException $se) {
					$s["invalid"] = TRUE;

					Logging::logError("Invalid share item: " . $ik);
					$invalid[] = $ik;
					$items[$ik] = array(
						"id" => $ik,
						"name" => "-",
					);
					continue;
				}
				if (!$item->exists()) {
					$s["invalid"] = TRUE;

					Logging::logError("Invalid share item (item does not exist): " . $ik);
					$invalid[] = $ik;
					$items[$ik] = array(
						"id" => $ik,
						"name" => "-",
					);
					continue;
				}
				$items[$ik] = $item->data();
			}
			$res["items"] = $items;
			$res["invalid"] = $invalid;
			$res["nonfs"] = $nonFs;

			$this->response()->success($res);
			return;
		}

		if (!isset($data["item"]) or !isset($data["name"])) {
			throw $this->invalidRequestException("No data");
		}
		if (count($this->path) != 0) {
			throw $this->invalidRequestException();
		}

		$itemId = $data["item"];
		if ($data["expiration"] and !is_numeric($data["expiration"])) {
			throw $this->invalidRequestException("Invalid datatype: expiration");
		}

		$this->handler()->addShare($itemId, $data["name"], $data["expiration"], isset($data["active"]) ? $data["active"] : TRUE, $data["restriction"]);
		$this->response()->success($this->handler()->getShares($itemId));
	}

	public function processPut() {
		if (count($this->path) != 1) {
			throw $this->invalidRequestException();
		}
		$data = $this->request->data;

		if ($this->path[0] == "list") {
			if (!isset($data["ids"]) or !is_array($this->request->data["ids"])) {
				throw $this->invalidRequestException("No data");
			}
			$update = array();
			if (isset($data["active"])) {
				$update["active"] = $data["active"];
			} else {
				throw $this->invalidRequestException("No data");
			}
			$this->handler()->updateShares($data["ids"], $update);
			$this->response()->success(array());
			return;
		}

		$id = $this->path[0];

		if (!isset($data["name"])) {
			throw $this->invalidRequestException("No data");
		}

		if ($data["expiration"] and !is_numeric($data["expiration"])) {
			throw $this->invalidRequestException("Invalid datatype: expiration " . $data["expiration"]);
		}

		$this->handler()->editShare($id, $data["name"], $data["expiration"], isset($data["active"]) ? $data["active"] : TRUE, $data["restriction"]);
		$this->response()->success(array());
	}

	private function handler() {
		return $this->env->plugins()->getPlugin("Share")->getHandler();
	}
}
?>
