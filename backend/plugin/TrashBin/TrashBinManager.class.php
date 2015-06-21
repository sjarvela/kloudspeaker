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

	public function onEvent($e) {
		if (strcmp(Session::EVENT_TYPE_SESSION, $e->type()) != 0) {
			return;
		}

		$type = $e->subType();
		if ($type === SessionEvent::LOGIN) {
			$this->checkExpired();
		}
	}

	public function getFolderDef($id) {
		return array("id" => "trash");
	}

	public function createFilesystem($id, $folderDef, $ctrl) {
		$fs = new TrashBinFS($this->env, $this->folder, $this->getUserTrashItems());
		return $fs;
	}

	public function onAction($ac, $i, $info) {
		if (FileEvent::DELETE != $ac) {
			return;
		}

		$this->checkExpired();

		$items = is_array($i) ? $i : array($i);
		$trashed = array();

		// validate
		foreach ($items as $item) {
			if ($item->isRoot()) {
				continue;
			}
			$this->env->filesystem()->assertRights($item, FilesystemController::PERMISSION_LEVEL_READWRITEDELETE, "trash");

			//TODO check if ignored (ignored roots?)

			$trashed[] = $item;
		}

		foreach ($trashed as $item) {
			Logging::logDebug("Trashing " . $item->internalPath());
			$this->moveToTrash($item);
		}

		$this->env->events()->onEvent(TrashBinEvent::trashed($trashed));

		return TRUE;
	}

	public function checkExpired() {
		$expirationDays = $this->getSetting("expiration_days");
		if ($expirationDays == NULL) {
			return;
		}

		$expirationTime = time() - ($expirationDays * 24 * 60 * 60);

		Logging::logDebug("Trash: checking expired");

		$expired = $this->dao()->getUserItems($this->env->session()->userId(), $expirationTime);
		if (!$expired or count($expired) == 0) {
			return;
		}

		Logging::logDebug("Trash items expired: " . count($expired));
		$this->deleteItems($expired);
	}

	private function moveToTrash($item) {
		$this->env->filesystem()->assertRights($item, FilesystemController::PERMISSION_LEVEL_READWRITEDELETE, "trash");

		$this->env->filesystem()->validateAction(TrashBinEvent::TRASH, $item, array("target" => $item));
		if ($this->env->filesystem()->triggerActionInterceptor(TrashBinEvent::TRASH, $item, array("target" => $item))) {
			return;
		}

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
		$fs = $this->env->filesystem()->filesystemFromId("trash");
		foreach ($fs->root()->items() as $item) {
			$result[] = $item->data();
		}
		return array("items" => $result, "data" => $this->getUserTrashItems());
	}

	public function deleteAllItems() {
		foreach ($this->getUserTrashItems() as $item) {
			$this->deleteItem($item);
		}
	}

	public function deleteItems($items) {
		foreach ($items as $itemId) {
			$this->deleteItem($itemId);
		}
	}

	public function deleteItem($it) {
		$i = is_array($it) ? $it : $this->dao()->getItem($it);
		if (!$this->env->authentication()->isAdmin() and strcasecmp($this->env->session()->userId(), $i["user_id"]) != 0) {
			throw new ServiceException("UNAUTHORIZED");
		}

		//trash item
		Logging::logDebug("Deleting trash item " . $i["id"] . "/" . $i["item_id"]);
		$item = $this->env->filesystem()->item($i["item_id"]);

		// original item
		$this->env->filesystem()->doDeleteItem($item, TRUE, TRUE, TRUE);

		$this->dao()->removeItem($i["id"]);
	}

	public function restoreItems($itemIds) {
		$this->checkExpired();

		$items = array();
		$originalItems = array();
		$rejected = array();
		foreach ($itemIds as $itemId) {
			$i = $this->dao()->getItem($itemId);
			$items[] = $i;

			$originalItem = $this->getOriginalItem($i);
			$originalItems[$i["id"]] = $originalItem;

			$rejectReason = $this->isRestoreForbidden($i, $originalItem);
			if ($rejectReason !== FALSE) {
				if (!in_array($rejectReason, $rejected)) {
					$rejected[$rejectReason] = array();
				}

				$rejected[$rejectReason][] = $i;
			}
		}
		if (count($rejected) > 0) {
			return $rejected;
		}

		// validate
		foreach ($items as $item) {
			$originalItem = $originalItems[$i["id"]];
			$this->env->filesystem()->assertRights($originalItem->parent(), FilesystemController::PERMISSION_LEVEL_READWRITE, "restore");
			$this->env->filesystem()->validateAction(TrashBinEvent::RESTORE, $originalItem);
			if ($this->env->filesystem()->triggerActionInterceptor(TrashBinEvent::RESTORE, $originalItem)) {
				return;
			}
		}

		$restored = array();
		$result = array();
		foreach ($items as $i) {
			$originalItem = $originalItems[$i["id"]];
			$this->doRestoreItem($i, $originalItem);
			$restored[] = $originalItem;
			$result[] = $originalItem->data();
		}
		$this->env->events()->onEvent(TrashBinEvent::restored($restored));

		return array("restored" => $result);
	}

	public function restoreItem($item) {
		$originalItem = $this->getOriginalItem($item);

		$this->env->filesystem()->assertRights($originalItem->parent(), FilesystemController::PERMISSION_LEVEL_READWRITE, "restore");
		$this->env->filesystem()->validateAction(TrashBinEvent::RESTORE, $originalItem);
		if ($this->env->filesystem()->triggerActionInterceptor(TrashBinEvent::RESTORE, $item)) {
			return;
		}
		$this->doRestoreItem($item, $originalItem);

		$this->env->events()->onEvent(TrashBinEvent::restored($originalItem));
	}

	private function doRestoreItem($i, $originalItem) {
		$item = $this->env->filesystem()->item($i["item_id"]);

		//restore file/folder
		$src = $this->getItemPath($i["id"], $item->isFile());
		$target = $originalItem->internalPath();

		Logging::logDebug("Restoring item " . $i["id"] . " -> " . $target);

		if (!rename($src, $target)) {
			Logging::logError("Could not restore item from trash to " . $target);
			return FALSE;
		}

		//restore item id
		$this->env->filesystem()->itemIdProvider()->move($item, $i["folder_id"] . ":/" . $i["path"]);

		$this->dao()->removeItem($i["id"]);

		return $originalItem;
	}

	private function isRestoreForbidden($item, $originalItem) {
		if (!$this->env->authentication()->isAdmin() and strcasecmp($this->env->session()->userId(), $item["user_id"]) != 0) {
			return "unauthorized";
		}
		if ($originalItem->exists()) {
			return "item_exists";
		}
		if (!$originalItem->parent()->exists()) {
			return "parent_missing";
		}
		if (!$this->env->filesystem()->hasRights($originalItem->parent(), FilesystemController::PERMISSION_LEVEL_READWRITE)) {
			return "insufficient_permissions";
		}
		return FALSE;
	}

	private function getOriginalItem($i) {
		return $this->env->filesystem()->filesystemFromId($i["folder_id"])->createItem($i["item_id"], $i["path"], TRUE);
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
?>