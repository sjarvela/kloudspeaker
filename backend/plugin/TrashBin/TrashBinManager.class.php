<?php

/**
 * TrashBinManager.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under Commercial Plugin License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "dao/TrashBinDao.class.php";
require_once "include/filesystem/KloudspeakerFilesystem.class.php";
require_once "include/filesystem/LocalFilesystem.class.php";

class TrashBinManager {
	private $env;
	private $settings;
	private $folder;

	function __construct($env, $settings) {
		$this->env = $env;
		$this->settings = $settings;
		$this->folder = $this->getSetting("folder") . rtrim(DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

		if (!file_exists($this->folder)) {
			throw new ServiceException("Trash folder does not exist: " . $this->folder);
		}
	}

	public function onAction($ac, $i, $info) {
		if (FileEvent::DELETE != $ac) {
			return;
		}

		$items = is_array($i) ? $i : array($i);

		foreach ($items as $item) {
			//TODO check if ignored (ignored roots?)
			Logging::logDebug("Trashing " . $item->internalPath());
			$this->moveToTrash($item);
		}

		$this->env->events()->onEvent(TrashBinEvent::trashed($items));

		return TRUE;
	}

	private function moveToTrash($item) {
		$id = $this->GUID();
		$trashPath = $this->getItemPath($id, $item->isFile());

		//move
		$src = $item->internalPath();
		if (!rename($src, $trashPath)) {
			Logging::logError("Could not move item to trash");
			return FALSE;
		}

		$created = $this->env->configuration()->formatTimestampInternal(time());

		$this->env->filesystem()->itemIdProvider()->move($item, "trash:/" . $id);
		$this->dao()->addItem($id, $item->id(), $item->filesystem()->id(), $item->path(), $this->env->session()->userId(), $created);
	}

	public function getUserTrashItems() {
		return $this->dao()->getUserItems($this->env->session()->userId());
	}

	public function getTrashItems($path = "") {
		//TODO path

		$result = array();
		$fs = new TrashBinFilesystem($this->env, $this->folder, $this->getUserTrashItems());
		foreach ($fs->root()->items() as $item) {
			$result[] = $item->data();
		}
		return $result;
	}

	public function deleteItems($items) {
		foreach ($items as $itemId) {
			$this->deleteItem($itemId);
		}
	}

	public function deleteItem($id) {
		$i = $this->dao()->getItem($id);
		if (!$this->env->authentication()->isAdmin() and strcasecmp($this->env->authentication() - userId(), $i["user_id"]) != 0) {
			throw new ServiceException("UNAUTHORIZED");
		}

		//trash item
		Logging::logDebug("Deleting trash item ".$id);
		$fs = new TrashBinFilesystem($this->env, $this->folder, $this->getUserTrashItems());
		$item = $fs->getItem($i["id"]);
		$item->delete();

		// original item
		Logging::logDebug("Deleting original item metadata ".$i["item_id"]);
		$originalItem = $this->env->filesystem()->filesystemFromId($i["folder_id"])->createItem($i["item_id"], $i["path"], TRUE);
		$this->env->filesystem()->doDeleteItem($originalItem, TRUE, TRUE, FALSE);

		$this->dao()->removeItem($i["id"]);
	}

	private function dao() {
		return new TrashBinDao($this->env);
	}

	private function getItemPath($id, $isFile) {
		return rtrim($this->folder, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $id . ($isFile ? "" : DIRECTORY_SEPARATOR);
	}

	private function GUID() {
		if (function_exists('com_create_guid') === true) {
			return str_replace('-', '', trim(com_create_guid(), '{}'));
		}

		return sprintf('%04X%04X%04X%04X%04X%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
	}

	public function getSetting($name, $default = NULL) {
		if (!$this->settings or !isset($this->settings[$name])) {
			return $default;
		}

		return $this->settings[$name];
	}

	public function __toString() {
		return "TrashBinManager";
	}
}

class TrashBinFilesystem extends LocalFilesystem {
	private $env;
	private $folder;
	private $rootItems;
	private $rootItemsById;

	function __construct($env, $folder, $rootItems) {
		parent::__construct("trash", array("name" => "trash", "path" => $folder), $this);
		$this->env = $env;
		$this->folder = $folder;
		$this->rootItems = $rootItems;
		$this->rootItemsById = array();
		foreach ($this->rootItems as $item) {
			$this->rootItemsById[$item["id"]] = $item;
		}
	}

	public function getItem($id) {
		//TODO path?
		$item = array_key_exists($id, $this->rootItemsById) ? $this->rootItemsById[$id] : FALSE;
		if (!$item) return NULL;

		$isFile = (strcasecmp(substr($item["path"], -1), itemIdProvider::PATH_DELIMITER) != 0);
		return $this->createItem($id, $id.($isFile ? "" : DIRECTORY_SEPARATOR));
	}

	public function env() {
		return $this->env;
	}

	public function itemIdProvider() {
		return $this;
	}

	public function isItemIgnored($parentPath, $name, $nativePath) {
		$p = substr($parentPath, strlen($this->folder));
		if (strlen($p) == 0 and !array_key_exists($name, $this->rootItemsById)) {
			return TRUE;
		}

		return FALSE;
	}

	protected function itemName($parentPath, $name, $nativePath) {
		$p = substr($parentPath, strlen($this->folder));
		if (strlen($p) == 0) {
			$item = array_key_exists($name, $this->rootItemsById) ? $this->rootItemsById[$name] : FALSE;
			if (!$item) {
				return FALSE;
			}

			$n = $item["path"];
			$n = strrchr(rtrim($n, DIRECTORY_SEPARATOR), DIRECTORY_SEPARATOR);
			if ($n !== FALSE) {
				return $n;
			}

			return $item["path"];
		}
		return $this->env->convertCharset($name);
	}

	public function getItemId($loc) {
		$l = substr($loc, 7);
		Logging::logDebug("ID: " . $loc . "-" . $l);
		if (strlen($l) == 0) {
			return "trash";
		}

		return $l;
	}
}
?>