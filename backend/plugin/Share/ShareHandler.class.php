<?php

/**
 * ShareHandler.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "dao/ShareDao.class.php";

class ShareHandler {
	private $env;
	private $settings;
	private $customShareHandlers;

	public function __construct($env, $settings) {
		$this->env = $env;
		$this->settings = $settings;
		$this->customShareHandlers = array();
	}

	public function registerHandler($type, $h) {
		$this->customShareHandlers[$type] = $h;
	}

	public function getItemContextData($item, $details, $key, $data) {
		$list = $this->getShareUsers($item);
		//Logging::logDebug(Util::array2str($list));
		$users = Util::arrayCol($list, "user_id");
		$count = count($users);
		$own = FALSE;
		$others = FALSE;
		if ($count > 0) {
			$own = in_array($this->env->session()->userId(), $users);
			$others = ($count - ($own ? 1 : 0) > 0);
		}

		return array(
			"count" => $own ? $this->dao()->getShareCount($item, $this->env->session()->userId()) : 0,
			"other_users" => $others,
		);
	}

	public function getRequestData($parent, $items, $key, $dataRequest) {
		if ($parent != NULL) {
			return $this->dao()->getUserSharesForChildren($parent, $this->env->session()->userId());
		}

		return $this->dao()->getUserSharesForItems($items, $this->env->session()->userId());
	}

	public function validateAction($action, $target, $acceptKeys) {
		if (FileEvent::DELETE != $action || !$target) {
			return;
		}

		$shareList = $this->getShareUsers($target);
		$usersByItemId = array();
		$itemId = "";
		foreach ($shareList as $r) {
			if (strcmp($r["item_id"], $itemId) != 0) {
				$itemId = $r["item_id"];
				$usersByItemId[$itemId] = array();
			}
			$usersByItemId[$itemId][] = $r["user_id"];
		}
		$list = array();

		foreach ($usersByItemId as $itemId => $users) {
			$count = count($users);
			if ($count == 0) {
				continue;
			}

			$own = in_array($this->env->session()->userId(), $users);
			$others = ($count - ($own ? 1 : 0) > 0);

			$sharedOwnKey = "item_shared-" . $itemId;
			$sharedOthersKey = "item_shared_others-" . $itemId;

			if ($own && !in_array($sharedOwnKey, $acceptKeys)) {
				$list[] = array("item" => $itemId, "reason" => "item_shared", "acceptable" => TRUE, "acceptKey" => $sharedOwnKey);
			}
			if ($others && (!$this->env->authentication()->isAdmin() || !in_array($sharedOthersKey, $acceptKeys))) {
				$list[] = array("item" => $itemId, "reason" => "item_shared_others", "acceptable" => $this->env->authentication()->isAdmin(), "acceptKey" => $sharedOthersKey);
			}
		}
		return $list;
	}

	public function getShare($id) {
		$share = $this->dao()->getShare($id);
		if (!$share) return NULL;
		if ($share["user_id"] != $this->env->session()->userId()) return NULL;
		return $share;
	}

	public function getShareInfo($id) {
		$share = $this->dao()->getShare($id, NULL, FALSE);
		if (!$share) return NULL;
		if (!$this->env->authentication()->isAdmin() and $share["user_id"] != $this->env->session()->userId()) return NULL;

		$itemId = $share["item_id"];
		$item = $this->getShareItem($itemId);

		$possibleTypes = $this->getShareTypes($item);
		if ($share["type"] == NULL) {
			$share["type"] = $possibleTypes[0];
		} else {
			if (!in_array($share["type"], $possibleTypes))
				throw new ServiceException("INVALID_REQUEST", "Invalid share type");
		}

		return array("share" => $share, "item" => (is_array($item) ? $item : $item->data()), "share_types" => $possibleTypes);
	}

	private function getShareItem($itemId, $anonymous = TRUE) {
		if (strpos($itemId, "_") > 0) {
			$parts = explode("_", $itemId);
			$info = $this->getCustomShareItem($parts[0], $parts[1]);
			if ($info == NULL) {
				return NULL;
			}
			return array("id" => $itemId, "item_id" => $parts[0], "name" => $info["name"], "custom" => TRUE, "type" => $parts[0]);
		}

		//TODO proper way to tell filesystem that "for this request, it is ok to access folder X"
		if ($anonymous) $this->env->filesystem()->allowFilesystems = TRUE;
		return $this->env->filesystem()->item($itemId);
	}

	public function getShareOptions($itemId) {
		$item = $this->getShareItem($itemId);
		return array("item" => (is_array($item) ? $item : $item->data()), "share_types" => $this->getShareTypes($item));
	}

	private function getShareTypes($item) {
		if (is_array($item)) {
			return $this->getCustomShareTypes($item["type"], $item["item_id"]);
		}
		return $this->getFileShareTypes($item);
	}

	private function getFileShareTypes($item) {
		// file
		if ($item->isFile()) return array("download");

		// folder
		$types = array();
		$types[] = "upload";
		if ($this->env->plugins()->exists("Archiver")) {
			$types[] = "prepared_download";
		}
		return $types;
	}

	public function getUserShares() {
		return $this->dao()->getUserShares($this->env->session()->userId());
	}

	public function processShareQuery($query) {
		return $this->dao()->processQuery($query);
	}

	public function getShares($itemId) {
		return $this->dao()->getShares($itemId, $this->env->session()->userId());
	}

	public function getShareUsers($i) {
		return $this->dao()->getShareUsers($i);
	}

	public function addShare($itemId, $name, $type, $expirationTs, $active, $restriction) {
		$item = $this->getShareItem($itemId, FALSE);
		if (!is_array($item)) {
			if (!$this->env->permissions()->hasFilesystemPermission("share_item", $item)) {
				throw new ServiceException("INSUFFICIENT_PERMISSIONS");
			}
		}

		$possibleTypes = $this->getShareTypes($item);
		if (!in_array($type, $possibleTypes))
			throw new ServiceException("INVALID_REQUEST", "Invalid share type");

		$created = $this->env->configuration()->formatTimestampInternal(time());
		$this->dao()->addShare($this->GUID(), $itemId, $name, $type, $this->env->session()->userId(), $expirationTs, $created, $active, $restriction);
	}

	public function editShare($id, $name, $type, $expirationTs, $active, $restriction) {
		$share = $this->dao()->getShare($id, NULL, FALSE);
		if ($share == NULL) {
			return;
		}

		$item = $this->getShareItem($share["item_id"], FALSE);
		if (!is_array($item)) {
			if (!$this->env->permissions()->hasFilesystemPermission("share_item", $item)) {
				throw new ServiceException("INSUFFICIENT_PERMISSIONS");
			}
		}

		$possibleTypes = $this->getShareTypes($item);
		if (!in_array($type, $possibleTypes))
			throw new ServiceException("INVALID_REQUEST", "Invalid share type");

		$this->dao()->editShare($id, $name, $type, $expirationTs, $active, $restriction);
	}

	public function getQuickShare($itemId) {
		$item = $this->getShareItem($itemId, FALSE);
		if (!is_array($item)) {
			if (!$this->env->permissions()->hasFilesystemPermission("share_item", $item)) {
				throw new ServiceException("INSUFFICIENT_PERMISSIONS");
			}
		}
		$created = FALSE;
		$qs = $this->dao()->getItemQuickShare($itemId, $this->env->session()->userId());
		if ($qs == NULL) {
			$this->addQuickShare($itemId, $item);
			$qs = $this->dao()->getItemQuickShare($itemId, $this->env->session()->userId());
			$created = TRUE;
		}
		return array("created" => $created, "share" => $qs);
	}

	private function addQuickShare($itemId, $item) {
		$id = $this->GUID();
		$name = "";
		$created = $this->env->configuration()->formatTimestampInternal(time());
		$possibleTypes = $this->getShareTypes($item);
		$type = $possibleTypes[0];

		$this->dao()->addShare($id, $itemId, $name, $type, $this->env->session()->userId(), NULL, $created, TRUE, FALSE, TRUE);
	}

	public function updateShares($ids, $update) {
		$this->dao()->updateShares($ids, $update);
	}

	public function deleteShare($id) {
		$this->dao()->deleteShare($id);
	}

	public function deleteShares($ids) {
		$this->dao()->deleteSharesById($ids);
	}

	public function deleteSharesForItem($item) {
		if (is_object($item)) $this->dao()->deleteShares($item);
		else $this->dao()->deleteSharesForItemId($item);
	}

	public function deleteUserSharesForItem($item, $userId = NULL) {
		$id = (is_object($item)) ? $item->id() : $item;
		$uid = $userId;
		if ($uid === NULL) $uid = $this->env->session()->userId();
		$this->dao()->deleteSharesForItemId($id, $uid);
	}

	public function getPublicShareInfo($id) {
		$share = $this->dao()->getShare($id, $this->env->configuration()->formatTimestampInternal(time()));
		if (!$share) {
			return NULL;
		}

		return $this->doGetSharePublicInfo($share);
	}

	private function doGetSharePublicInfo($share) {
		$itemId = $share["item_id"];
		//$type = NULL;
		$name = NULL;

		//TODO get types list
		/*if (strpos($itemId, "_") > 0) {
			$parts = explode("_", $itemId);
			$info = $this->getCustomShareInfo($parts[0], $parts[1], $share);
			if ($info == NULL) {
				return NULL;
			}

			$type = $info["type"];
			$name = $info["name"];
		} else {
			$this->env->filesystem()->allowFilesystems = TRUE;
			$item = $this->env->filesystem()->item($itemId);
			$type = $item->isFile() ? "download" : "upload";
			$name = $item->name();
		}*/

		$item = $this->getShareItem($itemId);
		if ($item == NULL)
			throw new ServiceException("INVALID_REQUEST", "Invalid share item");

		if (is_array($item)) $name = $item["name"];
		else $name = $item->name();

		$possibleTypes = $this->getShareTypes($item);
		if ($share["type"] == NULL) {
			$share["type"] = $possibleTypes[0];
		} else {
			if (!in_array($share["type"], $possibleTypes))
				throw new ServiceException("INVALID_REQUEST", "Invalid share type");
		}

		//TODO processed download
		$info = array("type" => $share["type"], "name" => $name, "restriction" => $share["restriction"]);

		if ($share["restriction"] == "pw") {
			$hash = $this->dao()->getShareHash($share["id"]);
			if ($hash and $this->checkStoredCookieAuth($share["id"], $hash)) {
				$info["auth"] = TRUE;
			}
		}

		return $info;
	}

	public function checkPublicShareAccessKey($id, $key) {
		$share = $this->dao()->getShare($id, $this->env->configuration()->formatTimestampInternal(time()));
		if (!$share) {
			return FALSE;
		}

		if ($share["restriction"] != "pw") {
			return FALSE;
		}

		$hash = $this->dao()->getShareHash($id);
		if ($hash == NULL or !isset($hash["hash"])) {
			throw new ServiceException("REQUEST_FAILED", "No share hash found");
		}

		if ($this->env->passwordHash()->isEqual(base64_decode($key), $hash["hash"], $hash["salt"])) {
			$this->storeShareAccessCookie($id, $hash);
			return TRUE;
		}
		return FALSE;
	}

	private function checkStoredCookieAuth($shareId, $hash) {
		if (!$this->env->cookies()->exists("share_access_" . $shareId)) {
			return FALSE;
		}

		$key = $this->env->cookies()->get("share_access_" . $shareId);
		Logging::logDebug("Share access cookie key " . $key);
		if (!$key or strlen($key) == 0) {
			return FALSE;
		}

		$check = $this->getCookieShareAuthString($shareId, $hash);
		if (strcmp($key, $check) != 0) {
			Logging::logDebug("Share access cookie found for share " . $shareId . ", but auth key did not match");
			return FALSE;
		}
		return TRUE;
	}

	private function getCookieShareAuthString($shareId, $hash) {
		return md5($shareId . "/" . $hash["salt"] . $hash["hash"]);
	}

	private function storeShareAccessCookie($shareId, $hash) {
		$this->env->cookies()->add("share_access_" . $shareId, $this->getCookieShareAuthString($shareId, $hash), time() + 60 * 60);
	}

	private function assertAccess($share) {
		if ($share["restriction"] == NULL) {
			return;
		}

		if ($share["restriction"] == "private") {
			if ($this->env->session()->isActive()) {
				return;
			}

			throw new ServiceException("UNAUTHORIZED");
		}
		if ($share["restriction"] == "pw") {
			$hash = $this->dao()->getShareHash($share["id"]);
			if ($hash == NULL or !isset($hash["hash"])) {
				throw new ServiceException("REQUEST_FAILED", "No share hash found");
			}

			$pw = $this->env->request()->hasParam("ak") ? $this->env->request()->param("ak") : NULL;
			if ($pw != NULL and strlen($pw) > 0) {
				if ($this->env->passwordHash()->isEqual(base64_decode($pw), $hash["hash"], $hash["salt"])) {
					return;
				}
			} else {
				if ($this->checkStoredCookieAuth($share["id"], $hash)) {
					return;
				}
			}

			throw new ServiceException("UNAUTHORIZED");
		}

		throw new ServiceException("REQUEST_FAILED", "Invalid share restriction: " . $share["restriction"]);
	}

	public function getCustomShareItem($type, $id) {
		if (!array_key_exists($type, $this->customShareHandlers)) {
			Logging::logError("No custom share handler found: " . $type);
			return NULL;
		}
		$handler = $this->customShareHandlers[$type];
		return $handler->getShareItem($id);
	}

	public function getCustomShareTypes($type, $id) {
		if (!array_key_exists($type, $this->customShareHandlers)) {
			Logging::logError("No custom share handler found: " . $type);
			return NULL;
		}
		$handler = $this->customShareHandlers[$type];
		return $handler->getShareTypes($id);
	}

	public function processShareGet($id, $params) {
		$share = $this->dao()->getShare($id, $this->env->configuration()->formatTimestampInternal(time()));
		if (!$share) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$this->assertAccess($share);

		$info = $this->doGetSharePublicInfo($share);
		if ($info == NULL or ($info["type"] != "download" and $info["type"] != "prepared_download")) {
			throw new ServiceException("INVALID_REQUEST", "Invalid share type");
		}

		if ($info["type"] == "prepared_download") {
			//TODO allow custom process?
			if (!isset($params["key"]))
				throw new ServiceException("INVALID_REQUEST", "Prepared key missing");

			$file = $this->env->session()->param($params["key"]);
			if (!$file or !file_exists($file)) {
				Logging::logDebug("Invalid share request, no prepared package found " . $params["key"] . ":" . $file);
				throw new ServiceException("INVALID_REQUEST");
			}

			$name = $info["name"];
			if (!$name or strlen($name) == 0) {
				$name = "download";	//TODO get from info?
			}

			$type = "zip"; //TODO get from archiver

			$mobile = ($this->env->request()->hasParam("m") and strcmp($this->env->request()->param("m"), "1") == 0);
			$this->env->response()->sendFile($file, $name . "." . $type, $type, $mobile, filesize($file));
			unlink($file);
			return;
		}

		$itemId = $share["item_id"];
		if (strpos($itemId, "_") > 0) {
			$parts = explode("_", $itemId);
			$this->processCustomGet($parts[0], $parts[1], $share, $params);
			return;
		}

		$this->env->filesystem()->allowFilesystems = TRUE;
		$item = $this->env->filesystem()->item($itemId);
		if (!$item) {
			throw new ServiceException("INVALID_REQUEST");
		}

		if (!$item->isFile()) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$this->processDownload($item);
	}

	public function processSharePrepareGet($id) {
		$share = $this->dao()->getShare($id, $this->env->configuration()->formatTimestampInternal(time()));
		if (!$share) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$this->assertAccess($share);

		$info = $this->doGetSharePublicInfo($share);
		if ($info == NULL or $info["type"] != "prepared_download") {
			throw new ServiceException("INVALID_REQUEST");
		}

		$itemId = $share["item_id"];
		if (strpos($itemId, "_") > 0) {
			$parts = explode("_", $itemId);
			$af = $this->processCustomPrepareGet($parts[0], $parts[1], $share);
		} else {
			$af = $this->processFilePrepareGet($itemId);
		}

		if (!$af) {
			throw new ServiceException("INVALID_REQUEST", "Could not prepare download");
		}

		$key = str_replace(".", "", uniqid('', true));

		Logging::logDebug("Storing prepared package " . $key . ":" . $af);
		$this->env->session()->param($key, $af);

		return array("key" => $key);
	}

	private function processFilePrepareGet($itemId) {
		$this->env->filesystem()->allowFilesystems = TRUE;
		$item = $this->env->filesystem()->item($itemId);
		if (!$item) {
			throw new ServiceException("INVALID_REQUEST", "Invalid item");
		}

		if ($item->isFile()) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$ap = $this->env->plugins()->getPlugin("Archiver");
		if (!$ap) {
			throw new ServiceException("INVALID_REQUEST", "No archiver plugin");
		}

		$am = $ap->getArchiveManager();
		Logging::logDebug("Share: compressing " . $item);
		return $am->compress($item);
	}

	private function processCustomGet($type, $id, $share, $params) {
		if (!array_key_exists($type, $this->customShareHandlers)) {
			Logging::logError("No custom share handler found: " . $type);
			die();
		}
		$handler = $this->customShareHandlers[$type];
		$handler->processGetShare($id, $share, $params);
	}

	private function processCustomPrepareGet($type, $id, $share) {
		if (!array_key_exists($type, $this->customShareHandlers)) {
			Logging::logError("No custom share handler found: " . $type);
			die();
		}
		$handler = $this->customShareHandlers[$type];
		return $handler->processPrepareGetShare($id, $share);
	}

	private function processDownload($file) {
		$mobile = ($this->env->request()->hasParam("m") and strcmp($this->env->request()->param("m"), "1") == 0);

		$this->env->permissions()->temporaryFilesystemPermission("filesystem_item_access", $file, FilesystemController::PERMISSION_LEVEL_READ);
		$this->env->filesystem()->download($file, $mobile);
	}

	public function processSharePost($id) {
		$share = $this->dao()->getShare($id);
		if (!$share) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$this->assertAccess($share);

		$info = $this->doGetSharePublicInfo($share);
		if ($info == NULL or $info["type"] != "upload") {
			throw new ServiceException("INVALID_REQUEST");
		}

		$this->env->filesystem()->allowFilesystems = TRUE;
		$item = $this->env->filesystem()->item($share["item_id"]);
		if (!$item or $item->isFile()) {
			throw new ServiceException("INVALID_REQUEST");
		}

		$this->processUpload($id, $item);
	}

	public function processUpload($shareId, $folder) {
		$this->env->permissions()->temporaryFilesystemPermission("filesystem_item_access", $folder, FilesystemController::PERMISSION_LEVEL_READWRITE);
		$this->env->filesystem()->uploadTo($folder);
	}

	public function onEvent($e) {
		if (strcmp(FilesystemController::EVENT_TYPE_FILE, $e->type()) != 0) {
			return;
		}

		$type = $e->subType();

		if ($type === FileEvent::DELETE) {
			foreach ($e->items() as $item) {
				$this->dao()->deleteShares($item);
			}
		}
	}

	private function dao() {
		return new ShareDao($this->env);
	}

	private function GUID() {
		if (function_exists('com_create_guid') === true) {
			return str_replace('-', '', trim(com_create_guid(), '{}'));
		}

		return sprintf('%04X%04X%04X%04X%04X%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
	}

	public function __toString() {
		return "ShareHandler";
	}
}
?>