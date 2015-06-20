<?php

/**
 * ItemCollectionHandler.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "dao/ItemCollectionDao.class.php";
require_once "include/configuration/UserEvent.class.php";

class ItemCollectionHandler {
	private $env;
	private $settings;

	public function __construct($env, $settings) {
		$this->env = $env;
		$this->settings = $settings;
	}

	/* share handler */

	public function processPrepareGetShare($id, $share) {
		$ic = $this->dao()->getItemCollection($id);
		if (!$ic) {
			Logging::logDebug("Invalid share request, no item collection found with id " . $id);
			throw new ServiceException("INVALID_REQUEST");
		}
		$this->env->filesystem()->allowFilesystems = TRUE;
		$items = $this->getItems($ic["items"]);
		foreach ($items as $item) {
			$this->env->permissions()->temporaryFilesystemPermission("filesystem_item_access", $item, FilesystemController::PERMISSION_LEVEL_READ);
		}

		$ap = $this->env->plugins()->getPlugin("Archiver");
		if (!$ap) {
			throw new ServiceException("INVALID_REQUEST", "No archiver plugin");
		}

		$am = $ap->getArchiveManager();
		$af = $am->compress($items);
		$key = str_replace(".", "", uniqid('', true));

		$this->env->events()->onEvent(MultiFileEvent::download($items));

		Logging::logDebug("Storing prepared package " . $key . ":" . $af);
		$this->env->session()->param($key, $af);

		return array("key" => $key);
	}

	public function processGetShare($id, $share, $params) {
		if ($params == NULL or !isset($params["key"])) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$ic = $this->dao()->getItemCollection($id);
		if (!$ic) {
			Logging::logDebug("Invalid share request, no item collection found with id " . $id);
			throw new ServiceException("INVALID_REQUEST");
		}

		$file = $this->env->session()->param($params["key"]);
		if (!$file or !file_exists($file)) {
			Logging::logDebug("Invalid share request, no prepared package found " . $params["key"] . ":" . $file);
			throw new ServiceException("INVALID_REQUEST");
		}

		$name = $ic["name"];
		if (!$name or strlen($name) == 0) {
			$name = "items";
		}

		$type = "zip"; //TODO get from archiver

		$mobile = ($this->env->request()->hasParam("m") and strcmp($this->env->request()->param("m"), "1") == 0);
		$this->env->response()->sendFile($file, $name . "." . $type, $type, $mobile, filesize($file));
		unlink($file);
	}

	public function getShareInfo($id, $share) {
		$ic = $this->dao()->getItemCollection($id);
		if (!$ic) {
			Logging::logDebug("Invalid share request, no item collection found with id " . $id);
			return NULL;
		}
		return array("name" => $ic["name"], "type" => "prepared_download");
	}

	public function getShareOptions($id) {
		return $this->getShareInfo($id, NULL);	//no share specific info, use NULL
	}

	/* -> share handler */

	public function getUserItemCollection($id) {
		return $this->dao()->getItemCollection($id, $this->env->session()->userId());
	}

	public function getUserItemCollections() {
		return $this->dao()->getUserItemCollections($this->env->session()->userId());
	}

	public function addUserItemCollection($name, $items) {
		$created = $this->env->configuration()->formatTimestampInternal(time());
		$this->dao()->addUserItemCollection($this->env->session()->userId(), $name, $items, $created);
	}

	public function addCollectionItems($id, $items) {
		$this->dao()->addCollectionItems($id, $this->env->session()->userId(), $items);
	}

	public function removeCollectionItems($id, $items) {
		$this->dao()->removeCollectionItems($id, $this->env->session()->userId(), $items);
	}

	public function deleteUserItemCollection($id) {
		$this->dao()->deleteUserItemCollection($id, $this->env->session()->userId());
		if ($this->env->plugins()->hasPlugin("Share")) {
			$this->env->plugins()->getPlugin("Share")->deleteSharesForItem("ic_" . $id);
		}
	}

	private function getItems($ids) {
		$result = array();

		foreach ($ids as $itemId) {
			$i = $this->env->filesystem()->item($itemId);

			if (!$i->exists()) {
				continue;
			}
			$result[] = $i;
		}

		return $result;
	}

	private function dao() {
		return new ItemCollectionDao($this->env);
	}

	public function onEvent($e) {
		$type = $e->type();
		$subType = $e->subType();

		if (strcmp(FilesystemController::EVENT_TYPE_FILE, $type) == 0 and $subType === FileEvent::DELETE) {
			foreach ($e->items() as $item) {
				$this->dao()->deleteCollectionItems($item);
			}
		} else if (strcmp(UserEvent::EVENT_TYPE_USER, $type) == 0 and $subType === UserEvent::USER_REMOVE) {
			$ids = $this->dao()->deleteUserItemCollections($e->id());
			if ($this->env->plugins()->hasPlugin("Share") and count($ids) > 0) {
				foreach ($ids as $id) {
					$this->env->plugins()->getPlugin("Share")->deleteSharesForItem("ic_" . $id);
				}
			}
		}
	}

	public function __toString() {
		return "ItemCollectionHandler";
	}
}
?>
