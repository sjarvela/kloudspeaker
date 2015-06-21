<?php

/**
 * FilesystemController.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "include/event/EventHandler.class.php";

class FilesystemController {

	const EVENT_TYPE_FILE = "filesystem";

	const PERMISSION_LEVEL_NONE = "n";
	const PERMISSION_LEVEL_READ = "r";
	const PERMISSION_LEVEL_READWRITE = "rw";
	const PERMISSION_LEVEL_READWRITEDELETE = "rwd";

	private $env;
	private $metadata;
	private $allowedUploadTypes;
	private $permissionCache = array();
	private $folderCache = array();
	private $contextPlugins = array();
	private $actionValidators = array();
	private $actionInterceptors = array();
	private $dataRequestPlugins = array();
	private $itemCleanupHandlers = array();
	private $searchers = array();
	private $filesystems = array();
	private $registeredFilesystemIds = array();
	private $idProvider;

	public $allowFilesystems = FALSE;

	function __construct($env) {
		require_once "KloudspeakerFilesystem.class.php";
		require_once "LocalFilesystem.class.php";
		require_once "FilesystemItem.class.php";
		require_once "BaseSearcher.class.php";
		require_once "FilesystemSearcher.class.php";
		require_once "CoreFileDataProvider.class.php";
		require_once "ItemIdProvider.class.php";
		require_once "include/metadata/MetadataController.class.php";
		require_once "FilesystemCommands.class.php";

		$this->env = $env;
		$this->idProvider = new ItemIdProvider($env);
		$this->metadata = new Kloudspeaker_MetadataController($env);

		$this->allowedUploadTypes = $env->settings()->setting('allowed_file_upload_types');
		$this->forbiddenUploadTypes = $env->settings()->setting('forbidden_file_upload_types');
		$this->ignoredItems = $env->settings()->setting('ignored_items');
	}

	public function initialize() {
		$this->registerFilesystem(LocalFilesystem::FS_TYPE, new LocalFilesystemFactory());

		FileEvent::register($this->env->events());

		$this->registerSearcher(new FileSystemSearcher($this->env));

		$coreData = new CoreFileDataProvider($this->env);
		$coreData->init($this);

		$this->env->permissions()->registerFilesystemPermission("filesystem_item_access", array(
			self::PERMISSION_LEVEL_NONE,
			self::PERMISSION_LEVEL_READ,
			self::PERMISSION_LEVEL_READWRITE,
			self::PERMISSION_LEVEL_READWRITEDELETE,
		));

		$this->env->permissions()->registerFilesystemPermission("edit_description");

		$this->metadata->initialize();
		$this->env->events()->register("filesystem/", $this);

		// register filesystem commands
		$cmds = new Kloudspeaker_FilesystemCommands($this->env);
		$cmds->initialize();
	}

	public function onEvent($e) {
		if (strcmp(FilesystemController::EVENT_TYPE_FILE, $e->type()) != 0) {
			return;
		}

		$this->metadata->onEvent($e);

		$type = $e->subType();

		if ($type === FileEvent::CREATE_ITEM or $type === FileEvent::CREATE_FOLDER or $type === FileEvent::UPLOAD or $type === FileEvent::COPY) {
			$items = array($e->item());
			if ($type === FileEvent::COPY) {
				$info = $e->info();
				$items = $info["targets"];
			}

			foreach ($items as $item) {
				$this->setCreatedMetadata($item);
			}
		}

		if ($type === FileEvent::UPDATE_CONTENT) {
			$items = array($e->item());

			foreach ($items as $item) {
				$this->updateModifiedMetadata($item);
			}
		}
	}

	public function setCreatedMetadata($item, $time = NULL, $by = NULL) {
		$t = $time;
		if ($t == NULL) {
			$t = '' . $this->env->configuration()->formatTimestampInternal(time());
		}

		$u = $by;
		if ($u == NULL) {
			$u = $this->env->session()->userId();
		}

		$this->metadata->set($item, "created", $t);
		$this->metadata->set($item, "created_by", $u);
		$this->updateModifiedMetadata($item, $t, $u);
	}

	public function updateModifiedMetadata($item, $time = NULL, $by = NULL) {
		$t = $time;
		if ($t == NULL) {
			$t = '' . $this->env->configuration()->formatTimestampInternal(time());
		}

		$u = $by;
		if ($u == NULL) {
			$u = $this->env->session()->userId();
		}

		$this->metadata->set($item, "modified", $t);
		$this->metadata->set($item, "modified_by", $u);
	}

	public function getCreatedMetadataInfo($item, $raw = FALSE) {
		$at = $this->metadata->get($item, "created");
		if ($at == NULL) {
			return NULL;
		}

		$by = $this->metadata->get($item, "created_by");
		if ($by != NULL and !$raw) {
			$user = $this->env->configuration()->getUser($by);
			if ($user == NULL) {
				$by = NULL;
			} else {
				$by = array(
					"id" => $user["id"],
					"name" => $user["name"],
				);
			}

		}
		return array(
			"at" => $at,
			"by" => $by,
		);
	}

	public function getModifiedMetadataInfo($item, $raw = FALSE) {
		$at = $this->metadata->get($item, "modified");
		if ($at == NULL) {
			return NULL;
		}

		$by = $this->metadata->get($item, "modified_by");
		if ($by != NULL and !$raw) {
			$user = $this->env->configuration()->getUser($by);
			if ($user == NULL) {
				$by = NULL;
			} else {
				$by = array(
					"id" => $user["id"],
					"name" => $user["name"],
				);
			}

		}
		return array(
			"at" => $at,
			"by" => $by,
		);
	}

	public function itemIdProvider() {
		return $this->idProvider;
	}

	public function metadata() {
		return $this->metadata;
	}

	public function registerFilesystem($id, $factory) {
		Logging::logDebug("Filesystem registered: " . $id);
		$this->filesystems[$id] = $factory;
	}

	public function registerItemCleanupHandler($h) {
		$this->itemCleanupHandlers[] = $h;
	}

	public function registerItemContextPlugin($key, $plugin) {
		$this->contextPlugins[$key] = $plugin;
	}

	public function registerActionInterceptor($key, $interceptor) {
		$this->actionInterceptors[$key] = $interceptor;
	}

	public function registerActionValidator($key, $validator) {
		$this->actionValidators[$key] = $validator;
	}

	public function registerDataRequestPlugin($keys, $plugin) {
		foreach ($keys as $key) {
			$this->dataRequestPlugins[$key] = $plugin;
		}
	}

	public function registerFilesystemId($id, $factory) {
		$this->registeredFilesystemIds[$id] = $factory;
	}

	public function getDataRequestPlugins() {
		return $this->dataRequestPlugins;
	}

	public function getRequestData($parent, $items, $data) {
		$requestDataResult = array();
		if (!$data or ($parent == NULL and (!$items or count($items) < 1))) {
			return $requestDataResult;
		}

		//Logging::logDebug("RQ data: " . Util::array2str($items) . " : " . Util::array2str($data));

		foreach ($this->getDataRequestPlugins() as $key => $plugin) {
			if (!array_key_exists($key, $data)) {
				continue;
			}

			$d = $plugin->getRequestData($parent, $items, $key, $data[$key]);
			if ($d !== NULL) {
				$requestDataResult[$key] = $d;
			}
		}

		return $requestDataResult;
	}

	public function registerSearcher($searcher) {
		$this->searchers[] = $searcher;
	}

	public function validateAction($action, $target, $data = NULL) {
		$list = array();
		$acceptKeys = $this->env->request()->hasData("acceptKeys") ? $this->env->request()->data("acceptKeys") : array();
		if ($acceptKeys == NULL) {
			$acceptKeys = array();
		}

		foreach ($this->actionValidators as $key => $v) {
			$ret = $v->validateAction($action, $target, $acceptKeys, $data);
			if ($ret) {
				$list[$key] = $ret;
			}
		}

		if (count($list) > 0) {
			throw new ServiceException("REQUEST_DENIED", "Action not allowed: " . $action, array(
				"action" => $action,
				"target" => $this->getItemData($target),
				"items" => $list,
			));
		}
	}

	public function triggerActionInterceptor($action, $item, $data = NULL) {
		foreach ($this->actionInterceptors as $key => $v) {
			if ($v->onAction($action, $item, $data)) {
				Logging::logDebug("Action [" . $action . "] intercepted by [" . $key . "], aborting original action");
				return TRUE;
			}
		}

		return FALSE;
	}

	private function getItemData($i) {
		$data = array();
		if (!is_array($i)) {
			$data[] = $i->data();
		} else {
			foreach ($i as $item) {
				$data[] = $item->data();
			}
		}

		return $data;
	}

	public function getRootFolders($all = FALSE) {
		$list = array();

		foreach ($this->getFolderDefs($all) as $folderDef) {
			$root = $this->filesystem($folderDef, !$all)->root();
			if (!$this->hasRights($root, self::PERMISSION_LEVEL_READ)) {
				continue;
			}

			$list[] = $root;
		}

		return $list;
	}

	public function getRootFoldersByKey($all = FALSE) {
		$list = array();

		foreach ($this->getRootFolders($all) as $r) {
			$list[$r->filesystem()->id()] = $r;
		}

		return $list;
	}

	private function getFolderDefs($all = FALSE) {
		if (!$all) {
			$folderDefs = $this->env->configuration()->getUserFolders($this->env->session()->userId(), TRUE);
		} else {
			$folderDefs = $this->env->configuration()->getFolders();
		}

		$list = array();

		foreach ($folderDefs as $folderDef) {
			if (array_key_exists($folderDef['id'], $list)) {
				continue;
			}

			if (!$this->isFolderValid($folderDef, !$all)) {
				continue;
			}

			if (!isset($folderDef["name"]) and !isset($folderDef["default_name"])) {
				$this->env->session()->end();
				throw new ServiceException("INVALID_CONFIGURATION", "Folder definition does not have a name (" . $folderDef['id'] . ")");
			}
			if (!isset($folderDef["path"])) {
				$this->env->session()->end();
				throw new ServiceException("INVALID_CONFIGURATION", "Folder definition does not have a path (" . $folderDef['id'] . ")");
			}

			$list[$folderDef['id']] = $folderDef;
		}

		return $list;
	}

	public function hasRights($item, $required) {
		if (is_array($item)) {
			foreach ($item as $i) {
				if (!$this->env->permissions()->hasFilesystemPermission("filesystem_item_access", $i, $required)) {
					return FALSE;
				}
			}

			return TRUE;
		}

		return $this->env->permissions()->hasFilesystemPermission("filesystem_item_access", $item, $required);
	}

	public function assertRights($item, $required, $desc = "Unknown action") {
		if (!$this->hasRights($item, $required)) {
			throw new ServiceException("INSUFFICIENT_PERMISSIONS", $desc . ", required: " . $required);
		}
	}

	private function isFolderValid($folderDef, $mustExist = TRUE) {
		$root = $this->filesystem($folderDef, $mustExist)->root();
		if ($mustExist and !$root->exists()) {
			throw new ServiceException("DIR_DOES_NOT_EXIST", 'root id:' . $folderDef['id']);
		}

		if (!$this->allowFilesystems and !$this->hasRights($root, self::PERMISSION_LEVEL_READ)) {
			return FALSE;
		}

		return TRUE;
	}

	private function createFilesystem($folderDef) {
		if ($folderDef == NULL) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid root folder definition");
		}

		$id = isset($folderDef['id']) ? $folderDef['id'] : '';
		$type = isset($folderDef['type']) ? $folderDef['type'] : NULL;

		if (array_key_exists($id, $this->registeredFilesystemIds)) {
			$factory = $this->registeredFilesystemIds[$id];
		} else {
			if ($type == NULL or !isset($this->filesystems[$type])) {
				throw new ServiceException("INVALID_CONFIGURATION", "Invalid root folder definition (" . $id . "), type unknown [" . $type . "]");
			}


			//TODO this is hack, support real filesystem types
			/*if (array_key_exists("S3FS", $this->filesystems)) {
			$factory = $this->filesystems["S3FS"];
			return $factory->createFilesystem($id, $folderDef, $this);
			}*/

			$factory = $this->filesystems[$type];
		}

		return $factory->createFilesystem($id, $folderDef, $this);
	}

	public function getSessionInfo() {
		$result = array();

		$result['filesystem'] = array(
			"max_upload_file_size" => Util::inBytes(ini_get("upload_max_filesize")),
			"max_upload_total_size" => Util::inBytes(ini_get("post_max_size")),
			"allowed_file_upload_types" => $this->allowedFileUploadTypes(),
			"forbidden_file_upload_types" => $this->forbiddenFileUploadTypes(),
		);

		$this->itemIdProvider()->loadRoots();

		$result["folders"] = array();
		foreach ($this->getRootFolders() as $id => $folder) {
			$nameParts = explode("/", str_replace("\\", "/", $folder->name()));
			$name = array_pop($nameParts);

			$result["folders"][] = array(
				"folder_id" => $folder->filesystem()->id(),
				"id" => $folder->id(),
				"name" => $name,
				"group" => implode("/", $nameParts),
				"parent_id" => NULL,
				"root_id" => $folder->id(),
				"path" => "",
			);
		}

		if ($this->env->authentication()->isAdmin()) {
			$result["roots"] = array();
			foreach ($this->getRootFolders(TRUE) as $id => $folder) {
				$nameParts = explode("/", str_replace("\\", "/", $folder->name()));
				$name = array_pop($nameParts);

				$result["roots"][] = array(
					"id" => $folder->id(),
					"name" => $name,
					"group" => implode("/", $nameParts),
					"parent_id" => NULL,
					"root_id" => $folder->id(),
					"path" => "",
				);
			}
		}

		return $result;
	}

	public function filesystemFromId($id, $assert = TRUE) {
		if (array_key_exists($id, $this->registeredFilesystemIds)) {
			$factory = $this->registeredFilesystemIds[$id];
			$folderDef = $factory->getFolderDef($id);
			return $this->filesystem($folderDef, $assert);
		}
		return $this->filesystem($this->env->configuration()->getFolder($id), $assert);
	}

	public function filesystem($def, $assert = TRUE) {
		$fs = $this->createFilesystem($def);
		if ($assert) {
			$fs->assert();
		}

		return $fs;
	}

	public function item($id, $nonexisting = FALSE) {
		return $this->itemWithLocation($this->itemIdProvider()->getLocation($id), $nonexisting);
	}

	public function itemWithLocation($location, $nonexisting = FALSE) {
		$parts = explode(":" . DIRECTORY_SEPARATOR, $location);
		if (count($parts) != 2) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid item location: " . $location);
		}

		$filesystemId = $parts[0];
		$path = $parts[1];
		if (strpos($path, "../") !== FALSE or strpos($path, "..\\") !== FALSE) {
			new ServiceException("INVALID_CONFIGURATION", "Invalid item location: " . $location);
		}

		if (array_key_exists($filesystemId, $this->folderCache)) {
			$folderDef = $this->folderCache[$filesystemId];
		} else if (array_key_exists($filesystemId, $this->registeredFilesystemIds)) {
			$factory = $this->registeredFilesystemIds[$filesystemId];
			$folderDef = $factory->getFolderDef($filesystemId);
		} else {
			$folderDef = $this->env->configuration()->getFolder($filesystemId);
			if (!$folderDef) {
				Logging::logDebug("Root folder does not exist: " . $location);
				throw new ServiceException("REQUEST_FAILED");
			}
			if (!$this->isFolderValid($folderDef)) {
				Logging::logDebug("No permissions for root folder: " . $location);
				throw new ServiceException("INSUFFICIENT_PERMISSIONS");
			}

			$this->folderCache[$filesystemId] = $folderDef;
		}
		if (strlen($path) == 0) {
			return $this->filesystem($folderDef)->root();
		}

		$id = $this->itemIdProvider()->getItemId($location);
		return $this->filesystem($folderDef)->createItem($id, $path, $nonexisting);
	}

	public function cleanupItemIds($ids) {
		$this->env->db()->startTransaction();
		$this->idProvider->deleteIds($ids);
		$this->env->configuration()->cleanupItemIds($ids);

		foreach ($this->itemCleanupHandlers as $cleanupHandler) {
			$cleanupHandler->cleanupItemIds($ids);
		}

		$this->env->db()->commit();
	}

	public function assertFilesystem($folderDef) {
		$this->filesystem($folderDef, TRUE);
	}

	public function isItemIgnored($filesystem, $parentPath, $name, $path) {
		if (!$this->ignoredItems or count($this->ignoredItems) == 0) {
			return FALSE;
		}

		//Logging::logDebug("isItemIgnored: ".$name."/".$path);

		foreach ($this->ignoredItems as $p) {
			if (preg_match($p, $path)) {
				return TRUE;
			}
		}
		return FALSE;
	}

	public function items($folder) {
		$this->env->permissions()->prefetchFilesystemChildrenPermissions("filesystem_item_access", $folder);
		$this->assertRights($folder, self::PERMISSION_LEVEL_READ, "items");
		$this->itemIdProvider()->load($folder);

		$list = array();
		foreach ($folder->items() as $i) {
			if (!$this->hasRights($i, self::PERMISSION_LEVEL_READ)) {
				continue;
			}

			$list[] = $i;
		}
		return $list;
	}

	public function hierarchy($folder) {
		$this->assertRights($folder, self::PERMISSION_LEVEL_READ, "hierarchy");
		$h = $folder->hierarchy();
		return $h;
	}

	public function details($item, $data = NULL) {
		$this->assertRights($item, self::PERMISSION_LEVEL_READ, "details");

		$details = $item->details();
		$details["metadata"] = $this->metadata->get($item);
		$details["permissions"] = $this->env->permissions()->getAllFilesystemPermissions($item);
		$details["parent_permissions"] = $item->isRoot() ? NULL : $this->env->permissions()->getAllFilesystemPermissions($item->parent());
		$details["plugins"] = $this->getItemContextData($item, $details, $data);

		return $details;
	}

	public function getItemContextData($item, $details, $data = NULL, $list = NULL) {
		$result = array();
		foreach ($this->contextPlugins as $k => $p) {
			if ($list != NULL and !in_array($k, $list)) {
				continue;
			}

			$d = ($data != NULL and isset($data[$k])) ? $data[$k] : NULL;
			$l = $p->getItemContextData($item, $details, $k, $d);
			if (!$l) {
				continue;
			}

			$result[$k] = $l;
		}
		return $result;
	}

	public function checkExisting($folder, $files) {
		$existing = array();

		foreach ($files as $file) {
			$f = $folder->fileWithName($file);
			if ($f->exists()) {
				$existing[] = $file;
			}
		}

		return $existing;
	}

	public function env() {
		return $this->env;
	}

	public function description($item) {
		return $this->metadata->get($item, "description");
	}

	public function setDescription($item, $desc) {
		if (!$this->env->permissions()->hasFilesystemPermission("edit_description", $item)) {
			throw new ServiceException("INSUFFICIENT_PERMISSIONS");
		}

		return $this->metadata->set($item, "description", $desc);
	}

	public function removeDescription($item) {
		if (!$this->env->permissions()->hasFilesystemPermission("edit_description", $item)) {
			throw new ServiceException("INSUFFICIENT_PERMISSIONS");
		}

		return $this->metadata->remove($item, "description");
	}

	private function allowedFileUploadTypes() {
		$types = array();
		foreach ($this->allowedUploadTypes as $type) {
			$pos = strrpos($type, ".");
			if ($pos === FALSE) {
				$types[] = $type;
			} else {
				$types[] = substr($type, $pos + 1);
			}
		}

		return $types;
	}

	private function forbiddenFileUploadTypes() {
		$types = array();
		foreach ($this->forbiddenUploadTypes as $type) {
			$pos = strrpos($type, ".");
			if ($pos === FALSE) {
				$types[] = $type;
			} else {
				$types[] = substr($type, $pos + 1);
			}
		}

		return $types;
	}

	public function rename($item, $name) {
		Logging::logDebug('rename from [' . $item->path() . '] to [' . $name . ']');
		$this->assertRights($item, self::PERMISSION_LEVEL_READWRITE, "rename");
		$to = $item->rename($name);

		$this->env->events()->onEvent(FileEvent::rename($item, $to));
		$this->idProvider->move($item, $to);
	}

	public function copy($item, $to, $name = NULL) {
		Logging::logDebug('copying ' . $item->id() . "[" . $item->internalPath() . '] to ' . $to->id() . "[" . $to->internalPath() . '] ' . $name);

		if ($to->isFile()) {
			throw new ServiceException("NOT_A_DIR", $to->path());
		}

		if ($item->isFile()) {
			$target = $to->fileWithName($name != NULL ? $name : $item->name());
		} else {
			$target = $to->folderWithName($name != NULL ? $name : $item->name());
		}

		$this->assertRights($item, self::PERMISSION_LEVEL_READ, "copy");
		$this->assertRights($to, self::PERMISSION_LEVEL_READWRITE, "copy");

		$overwrite = $this->env->request()->hasData("overwrite") ? ($this->env->request()->data("overwrite") == 1) : FALSE;
		$replace = ($overwrite or $this->env->plugins()->hasPlugin("History") and $this->env->plugins()->getPlugin("History")->isItemActionVersioned($item, FileEvent::COPY, array("to" => $to, "target" => $target)));

		if ($target->exists()) {
			if (!$item->isFile()) {
				// cannot overwrite folder
				throw new ServiceException("DIR_ALREADY_EXISTS");
			}

			if (!$replace) {
				throw new ServiceException("FILE_ALREADY_EXISTS");
			}
			$this->assertRights($target, self::PERMISSION_LEVEL_READWRITE, "copy");
		}

		$this->validateAction(FileEvent::COPY, $item, array("to" => $to, "target" => $target, "replace" => $replace));
		if ($this->triggerActionInterceptor(FileEvent::COPY, $item, array("to" => $to, "target" => $target, "replace" => $replace))) {
			return;
		}

		if ($item->isFile() and $target->exists()) {
			if ($overwrite) {
				Logging::logDebug("File exists, overwriting");
				$target->delete(); //"soft-delete", just remove content, no events that remove meta-data
				//TODO update content instead of delete&copy??
			}
		}

		$target = $item->copy($target);
		$this->env->events()->onEvent(FileEvent::copy($item, $target, $replace));
	}

	public function copyItems($items, $folder) {
		Logging::logDebug('copying ' . count($items) . ' items to [' . $folder->internalPath() . ']');
		$this->assertRights($items, self::PERMISSION_LEVEL_READ, "copy");

		$existingFiles = array();
		$existingFolders = array();

		$overwrite = $this->env->request()->hasData("overwrite") ? ($this->env->request()->data("overwrite") == 1) : FALSE;
		foreach ($items as $item) {
			if ($item->isFile()) {
				if ($folder->fileExists($item->name())) {
					$replace = $this->env->plugins()->hasPlugin("History") and $this->env->plugins()->getPlugin("History")->isItemActionVersioned($item, FileEvent::COPY, array("to" => $folder));

					if (!$replace) {
						$existingFiles[] = $folder->fileWithName($item->name());
					}
				}
			} else {
				if ($folder->folderExists($item->name())) {
					$existingFolders[] = $folder->folderWithName($item->name());
				}
			}
		}

		if (count($existingFolders) > 0) {
			// cannot overwrite folders
			throw new ServiceException("DIR_ALREADY_EXISTS");
		}
		if (count($existingFiles) > 0 and !$overwrite) {
			$info = array();
			foreach ($existingFiles as $file) {
				$info[] = $file->data();
			}
			throw new ServiceException("FILE_ALREADY_EXISTS", "One or more files already exists", array("files" => $info));
		}

		$this->validateAction(FileEvent::COPY, $items, array("to" => $folder, "replace" => $overwrite));
		if ($this->triggerActionInterceptor(FileEvent::COPY, $items, array("to" => $folder, "replace" => $overwrite))) {
			return;
		}

		$targets = array();
		foreach ($items as $item) {
			if ($item->isFile()) {
				$to = $folder->fileWithName($item->name());
				$fileOverwrite = FALSE;
				if ($to->exists() and $overwrite) {
					$fileOverwrite = TRUE;
					if (Logging::isDebug()) {
						Logging::logDebug("File exists " . $to->internalPath() . ", overwriting");
					}

					$to->delete(); //"soft-delete", just remove content, no events that remove meta-data
				}
				$to = $item->copy($to);
				$targets[] = $to;
			} else {
				$to = $item->copy($folder->folderWithName($item->name()));
				$targets[] = $to;
			}
		}

		$this->env->events()->onEvent(MultiFileEvent::copy($items, $folder, $targets, $replace));
	}

	public function move($item, $to) {
		Logging::logDebug('moving ' . $item->id() . "[" . $item->path() . '] to [' . $to . ']');
		if ($item->isRoot()) {
			throw new ServiceException("INSUFFICIENT_PERMISSIONS", "Cannot move root folders");
		}

		if ($to->isFile()) {
			throw new ServiceException("NOT_A_DIR", $to->path());
		}

		if ($item->parent()->id() == $to->id()) {
			if ($item->isFile()) {
				throw new ServiceException("FILE_ALREADY_EXISTS");
			} else {
				throw new ServiceException("DIR_ALREADY_EXISTS");
			}
		}

		$this->assertRights($item, self::PERMISSION_LEVEL_READ, "move");
		$this->assertRights($to, self::PERMISSION_LEVEL_READWRITE, "move");

		$overwrite = $this->env->request()->hasData("overwrite") ? ($this->env->request()->data("overwrite") == 1) : FALSE;
		$version = ($this->env->plugins()->hasPlugin("History") and $this->env->plugins()->getPlugin("History")->isItemActionVersioned($item, FileEvent::MOVE, array("to" => $to)));
		$replace = ($overwrite or $version);

		if ($item->isFile()) {
			if ($to->fileExists($item->name())) {
				if (!$replace) {
					throw new ServiceException("FILE_ALREADY_EXISTS");
				} else {
					$this->assertRights($to->fileWithName($item->name()), self::PERMISSION_LEVEL_READWRITEDELETE);
				}
			}
		} else {
			if ($to->folderExists($item->name())) {
				throw new ServiceException("DIR_ALREADY_EXISTS");
			}
		}

		$this->validateAction(FileEvent::MOVE, $item, array("to" => $to, "replace" => $replace));
		if ($this->triggerActionInterceptor(FileEvent::MOVE, $item, array("to" => $to, "replace" => $replace))) {
			return;
		}

		if ($item->isFile() and $to->fileExists($item->name())) {
			if ($overwrite) {
				Logging::logDebug("File exists, overwriting");
				$target = $to->fileWithName($item->name());
				$this->doDeleteItem($target); // "hard-delete", remove also meta-data
			}
		}

		$moved = $item->move($to);
		if (!$version) {
			$this->env->events()->onEvent(FileEvent::move($item, $moved, $replace));
			$this->idProvider->move($item, $moved);
		} else {
			//when versioning, "move" only created metadata and remove original item's other data
			$target = $to->fileWithName($item->name());

			$meta = $this->getCreatedMetadataInfo($item, TRUE);
			if ($meta != NULL) {
				$this->setCreatedMetadata($target, $meta["at"], $meta["by"]);
			}
			$meta = $this->getModifiedMetadataInfo($item, TRUE);
			if ($meta != NULL) {
				$this->updateModifiedMetadata($target, $meta["at"], $meta["by"]);
			}

			$this->doDeleteItem($item, TRUE, TRUE, FALSE); // "hard-delete", remove also meta-data
		}
	}

	public function moveItems($items, $to) {
		Logging::logDebug('moving ' . count($items) . ' items');

		if ($to->isFile()) {
			throw new ServiceException("NOT_A_DIR", $to->path());
		}

		$this->assertRights($items, self::PERMISSION_LEVEL_READWRITE, "move");

		$existingFiles = array();
		$existingFolders = array();

		$overwrite = $this->env->request()->hasData("overwrite") ? ($this->env->request()->data("overwrite") == 1) : FALSE;
		foreach ($items as $item) {
			if ($item->isRoot()) {
				throw new ServiceException("INVALID_REQUEST", "Cannot move root folder:" . $item->id());
			}

			if ($item->isFile()) {
				if ($to->fileExists($item->name())) {
					$replace = ($this->env->plugins()->hasPlugin("History") and $this->env->plugins()->getPlugin("History")->isItemActionVersioned($item, FileEvent::MOVE, array("to" => $to)));

					if (!$replace) {
						$target = $to->fileWithName($item->name());
						$existingFiles[] = $target;
					}
				}
			} else {
				if ($to->folderExists($item->name())) {
					$existingFolders[] = $item->name();
				}
			}
		}

		if (count($existingFolders) > 0) {
			// cannot overwrite folders
			throw new ServiceException("DIR_ALREADY_EXISTS");
		}
		Logging::logDebug("Exists: " . count($existingFiles));
		if (count($existingFiles) > 0) {
			if (!$overwrite) {
				$info = array();
				foreach ($existingFiles as $file) {
					$info[] = $file->data();
				}
				throw new ServiceException("FILE_ALREADY_EXISTS", "One or more files already exists", array("files" => $info));
			} else {
				foreach ($existingFiles as $file) {
					$this->assertRights($file, self::PERMISSION_LEVEL_READWRITEDELETE);
				}
			}
		}

		$this->validateAction(FileEvent::MOVE, $items, array("to" => $to, "replace" => $overwrite));
		if ($this->triggerActionInterceptor(FileEvent::MOVE, $items, array("to" => $to, "replace" => $overwrite))) {
			return;
		}

		//TODO versioning?
		$new = array();
		$targets = array();
		foreach ($items as $item) {
			if ($item->isFile()) {
				$fileOverwrite = FALSE;
				if ($overwrite and $to->fileExists($item->name())) {
					$fileOverwrite = TRUE;

					$target = $to->fileWithName($item->name());
					if (Logging::isDebug()) {
						Logging::logDebug("File exists " . $target->internalPath() . ", overwriting");
					}
					$this->doDeleteItem($target); // "hard-delete", remove also meta-data
				}
			}

			$target = $item->move($to);
			$targets[] = $target;
			$new[$item->id()] = $target;
		}
		$this->env->events()->onEvent(MultiFileEvent::move($items, $to, $targets, $overwrite));
		foreach ($items as $item) {
			$this->idProvider->move($item, $new[$item->id()]);
		}
	}

	public function delete($item, $allowRoot = FALSE) {
		Logging::logDebug('deleting [' . $item->id() . ']');
		if ($item->isRoot()) {
			if (!$allowRoot or !$this->env->authentication()->isAdmin()) {
				throw new ServiceException("INVALID_REQUEST", "Cannot delete root folders");
			}

		}

		$this->assertRights($item, self::PERMISSION_LEVEL_READWRITEDELETE, "delete");

		$this->validateAction(FileEvent::DELETE, $item);
		if ($this->triggerActionInterceptor(FileEvent::DELETE, $item)) {
			return;
		}
		$this->doDeleteItem($item);
	}

	public function doDeleteItem($item, $sendEvent = TRUE, $removeId = TRUE, $removeFile = TRUE) {
		if ($removeFile && $item->exists()) {
			$item->delete();
		}

		$this->env->permissions()->removeFilesystemPermissions($item);

		if ($sendEvent) {
			$this->env->events()->onEvent(FileEvent::delete($item));
		}

		if ($removeId) {
			$this->idProvider->delete($item);
		}
	}

	public function deleteItems($items) {
		Logging::logDebug('deleting ' . count($items) . ' items');
		foreach ($items as $item) {
			if ($item->isRoot()) {
				throw new ServiceException("INVALID_REQUEST", "Cannot delete root folder:" . $item->id());
			}
		}

		$this->assertRights($items, self::PERMISSION_LEVEL_READWRITEDELETE, "delete");

		$this->validateAction(FileEvent::DELETE, $items);

		if ($this->triggerActionInterceptor(FileEvent::DELETE, $items)) {
			return;
		}

		foreach ($items as $item) {
			$this->doDeleteItem($item, FALSE, FALSE);
		}
		$this->env->events()->onEvent(MultiFileEvent::delete($items));
		foreach ($items as $item) {
			$this->idProvider->delete($item);
		}
	}

	public function createItem($item) {
		if ($item == NULL) {
			return;
		}

		if ($item->exists()) {
			throw new ServiceException("FILE_ALREADY_EXISTS");
		}

		$parent = $item->parent();
		$this->assertRights($parent, self::PERMISSION_LEVEL_READWRITE, "create item");
		$this->validateAction(FileEvent::CREATE_ITEM, $item);
		if ($this->triggerActionInterceptor(FileEvent::CREATE_ITEM, $item)) {
			return;
		}

		$new = $item->create();
		if ($new->isFile()) {
			$this->env->events()->onEvent(FileEvent::createItem($new));
		} else {
			$this->env->events()->onEvent(FileEvent::createFolder($new));
		}

		return $new;
	}

	public function createFile($parent, $name, $content = NULL, $size = 0) {
		Logging::logDebug('creating file [' . $parent->id() . '/' . $name . ']');
		$this->assertRights($parent, self::PERMISSION_LEVEL_READWRITE, "create file");

		$target = $parent->fileWithName($name);
		$this->validateAction(FileEvent::CREATE_ITEM, $target, array("size" => $size));
		if ($this->triggerActionInterceptor(FileEvent::CREATE_ITEM, $target, array("size" => $size))) {
			return NULL;
		}

		$new = $parent->createFile($name);
		if ($content != NULL) {
			$new->put($content);
		}

		$this->env->events()->onEvent(FileEvent::createItem($new));
		return $new;
	}

	public function createFolder($parent, $name) {
		Logging::logDebug('creating folder [' . $parent->id() . '/' . $name . ']');
		$this->assertRights($parent, self::PERMISSION_LEVEL_READWRITE, "create folder");

		$target = $parent->folderWithName($name);
		$this->validateAction(FileEvent::CREATE_FOLDER, $target);
		if ($this->triggerActionInterceptor(FileEvent::CREATE_FOLDER, $target)) {
			return;
		}

		$new = $parent->createFolder($name);
		$this->env->events()->onEvent(FileEvent::createFolder($new));
		return $new;
	}

	public function download($file, $mobile, $range = NULL) {
		if (!$range) {
			Logging::logDebug('download [' . $file->id() . ']');
		}

		$this->assertRights($file, self::PERMISSION_LEVEL_READ, "download");
		if ($this->triggerActionInterceptor(FileEvent::DOWNLOAD, $file, array("mobile" => $mobile, "range" => $range))) {
			return;
		}

		if (!$file->filesystem()->isDirectDownload()) {
			$this->env->response()->redirect($file->filesystem()->getDownloadUrl($file));
			return;
		}

		$name = $file->name();
		$size = $file->size();
		$range = $this->getDownloadRangeInfo($range);

		if ($range) {
			Logging::logDebug("Download range " . $range[0] . "-" . $range[1]);
		} else {
			$this->env->events()->onEvent(FileEvent::download($file));
		}

		$this->env->response()->download($name, $file->extension(), $mobile, $file->read($range), $size, $range);
	}

	// TODO somewhere else
	public function getDownloadRangeInfo($range) {
		if ($range == NULL) {
			return NULL;
		}
		list($unit, $range) = explode('=', $range, 2);

		if ($unit == 'bytes') {
			$pos = strpos(",", $range);
			if ($pos != false) {
				if ($pos === 0) {
					return NULL;
				} else if ($pos >= 0) {
					$range = substr($range, 0, $pos);
				}
			}
		} else {
			return NULL;
		}

		list($start, $end) = explode('-', $range, 2);

		$end = (empty($end)) ? ($size - 1) : min(abs(intval($end)), ($size - 1));
		$start = (empty($start) || $end < abs(intval($start))) ? 0 : max(abs(intval($start)), 0);
		return array($start, $end, $size);
	}

	public function view($file) {
		Logging::logDebug('view [' . $file->id() . ']');
		$this->assertRights($file, self::PERMISSION_LEVEL_READ, "view");
		$this->env->events()->onEvent(FileEvent::view($file));
		$this->env->response()->send($file->name(), $file->extension(), $file->read(), $file->size());
	}

	public function read($file) {
		Logging::logDebug('read [' . $file->id() . ']');
		$this->assertRights($file, self::PERMISSION_LEVEL_READ, "read");
		$this->env->events()->onEvent(FileEvent::view($file));
		return $file->read();
	}

	public function updateFileContents($item, $content, $size = 0) {
		if (!$item->isFile()) {
			throw new ServiceException("NOT_A_FILE", $item->path());
		}

		$this->validateAction(FileEvent::UPDATE_CONTENT, $item, array("size" => $size));
		if ($this->triggerActionInterceptor(FileEvent::UPDATE_CONTENT, $item, array("name" => $item->name(), "target" => $item, "size" => $size))) {
			return;
		}

		Logging::logDebug('updating file contents [' . $item->id() . ']');
		$this->assertRights($item, self::PERMISSION_LEVEL_READWRITE, "update content");

		$item->put($content);

		$this->env->events()->onEvent(FileEvent::updateContent($item));
	}

	public function getUploadTempDir() {
		$dir = $this->env->settings()->setting("upload_temp_dir");
		if ($dir != NULL and strlen($dir) > 0) {
			return $dir;
		}

		return sys_get_temp_dir();
	}

	public function uploadTo($folder) {
		$this->assertRights($folder, self::PERMISSION_LEVEL_READWRITE, "upload");

		//if (Logging::isDebug()) Logging::logDebug("Upload to ".$folder->id().", FILES=".Util::array2str($_FILES));

		if (!isset($_FILES['uploader-http']) and !isset($_FILES['uploader-html5'])) {
			if (!isset($_SERVER['HTTP_CONTENT_DISPOSITION'])) {
				throw new ServiceException("NO_UPLOAD_DATA");
			}

			// stream uploading
			$name = isset($_SERVER['HTTP_CONTENT_DISPOSITION']) ? rawurldecode(preg_replace('/(^[^"]+")|("$)/', '', $_SERVER['HTTP_CONTENT_DISPOSITION'])) : null;
			$type = isset($_SERVER['HTTP_CONTENT_DESCRIPTION']) ? $_SERVER['HTTP_CONTENT_DESCRIPTION'] : null;
			$range = isset($_SERVER['HTTP_CONTENT_RANGE']) ? preg_split('/[^0-9]+/', $_SERVER['HTTP_CONTENT_RANGE']) : null;
			$size = $range ? $range[3] : null;

			if (Logging::isDebug()) {
				Logging::logDebug("Stream upload: " . $name . " " . Util::array2str($range));
			}

			$info[] = $this->upload(
				$folder,
				$name,
				FALSE, // read from stream
				$size,
				$type,
				$range
			);

			return;
		}

		// html5 uploader
		if (isset($_FILES['uploader-html5'])) {
			//if (!isset($_FILES['uploader-html5']['tmp_name'])) throw new ServiceException("UPLOAD_FAILED");

			$name = isset($_SERVER['HTTP_CONTENT_DISPOSITION']) ? rawurldecode(preg_replace('/(^[^"]+")|("$)/', '', $_SERVER['HTTP_CONTENT_DISPOSITION'])) : null;
			$type = isset($_SERVER['HTTP_CONTENT_DESCRIPTION']) ? $_SERVER['HTTP_CONTENT_DESCRIPTION'] : null;
			$range = isset($_SERVER['HTTP_CONTENT_RANGE']) ? preg_split('/[^0-9]+/', $_SERVER['HTTP_CONTENT_RANGE']) : null;
			$size = $range ? $range[3] : null;
			$files = $_FILES['uploader-html5'];

			if (is_array($files['tmp_name'])) {
				foreach ($files['tmp_name'] as $index => $value) {
					if (isset($files['error'][$index]) && $files['error'][$index] != UPLOAD_ERR_OK) {
						throw new ServiceException("UPLOAD_FAILED", $files['error'][$index]);
					}
				}

				foreach ($files['tmp_name'] as $index => $value) {
					$info[] = $this->upload(
						$folder,
						$name ? $name : $files['name'][$index],
						$files['tmp_name'][$index],
						$size ? $size : $files['size'][$index],
						$type ? $type : $files['type'][$index],
						$range
					);
				}
			} else {
				if (isset($files['error']) && $files['error'] != UPLOAD_ERR_OK) {
					throw new ServiceException("UPLOAD_FAILED", $files['error']);
				}

				$info[] = $this->upload(
					$folder,
					$name ? $name : (isset($files['name']) ? $files['name'] : null),
					isset($files['tmp_name']) ? $files['tmp_name'] : null,
					$size ? $size : (isset($files['size']) ? $files['size'] : $_SERVER['CONTENT_LENGTH']),
					$type ? $type : (isset($files['type']) ? $files['type'] : $_SERVER['CONTENT_TYPE']),
					$range
				);
			}
			//$this->upload($folder, $_FILES['uploader-html5']['name'][0], $_FILES['uploader-html5']['tmp_name'][0]);
			return;
		}

		// http
		if (isset($_FILES["file"]) && isset($_FILES["file"]["error"]) && $_FILES["file"]["error"] != UPLOAD_ERR_OK) {
			throw new ServiceException("UPLOAD_FAILED", $_FILES["file"]["error"]);
		}

		foreach ($_FILES['uploader-http']['name'] as $key => $value) {
			$name = $_FILES['uploader-http']['name'][$key];
			$origin = $_FILES['uploader-http']['tmp_name'][$key];
			$this->upload($folder, $name, $origin);
		}
	}

	private function upload($folder, $name, $origin, $size = NULL, $type = NULL, $range = NULL) {
		$this->assertUploadFileType($name);

		$append = ($range != NULL and $range[1] != 0);
		//TODO check for max post size, range etc
		$target = $folder->fileWithName($name);
		Logging::logDebug('uploading to [' . $target . '] file [' . $name . '],size=' . $size . ',type=' . $type . ',range=' . Util::array2str($range) . ',append=' . $append);

		if (!$append) {
			$this->validateAction(FileEvent::UPLOAD, $target, array("size" => $size));
			if ($this->triggerActionInterceptor(FileEvent::UPLOAD, $target, array("size" => $size))) {
				return;
			}
		}

		if (!$append and $target->exists()) {
			$target = $this->findFreeFileWithIndex($folder, $name);
			$target = $folder->createFile($target->name());
		}

		//if ($target->exists()) throw new ServiceException("FILE_ALREADY_EXISTS");

		$fromFile = ($origin && is_uploaded_file($origin));

		if ($fromFile) {
			$src = @fopen($origin, "rb");
		} else {
			$src = @fopen('php://input', 'r');
		}
		if (!$src) {
			throw new ServiceException("SAVING_FAILED", "Failed to read uploaded data");
		}

		$target->write($src, $append);
		fclose($src);
		if ($fromFile) {
			unlink($origin);
		}

		if ($range == NULL or ($range[2] >= $range[3] - 1)) {
			$this->env->events()->onEvent(FileEvent::upload($target));
		}
	}

	private function findFreeFileWithIndex($folder, $name) {
		$index = 1;
		$base = $name;
		$ext = strrchr($name, ".");

		if ($ext != FALSE) {
			$base = substr($name, 0, 0 - strlen($ext));
		} else {
			$ext = "";
		}

		while (TRUE) {
			$file = $folder->fileWithName($base . "(" . $index . ")" . $ext);
			if (!$file->exists()) {
				return $file;
			}

			$index = $index + 1;
			if ($index > 100) {
				break;
			}
		}

		throw new ServiceException("FILE_ALREADY_EXISTS");
	}

	public function assertUploadFileType($name) {
		$ext = ltrim(strrchr($name, "."), ".");
		if ($ext === FALSE) {
			return;
		}

		$ext = strtolower($ext);

		if (Logging::isDebug()) {
			Logging::logDebug("FORBIDDEN " . $ext . ": " . Util::array2str($this->forbiddenUploadTypes));
		}

		if (count($this->forbiddenUploadTypes) > 0 and in_array($ext, $this->forbiddenUploadTypes)) {
			throw new ServiceException("UPLOAD_FILE_NOT_ALLOWED");
		}

		if (Logging::isDebug()) {
			Logging::logDebug("ALLOWED " . $ext . ": " . Util::array2str($this->allowedUploadTypes));
		}

		if (count($this->allowedUploadTypes) > 0 and !in_array($ext, $this->allowedUploadTypes)) {
			throw new ServiceException("UPLOAD_FILE_NOT_ALLOWED");
		}
	}

	public function uploadFrom($folder, $name, $stream, $src = '[Unknown]') {
		$this->assertUploadFileType($name);
		$this->assertRights($folder, self::PERMISSION_LEVEL_READWRITE, "upload");

		$targetItem = $folder->createFile($name);
		if (Logging::isDebug()) {
			Logging::logDebug("Upload from $src ($name) to " . $targetItem->id());
		}

		$targetItem->write($stream, FALSE);

		$this->env->events()->onEvent(FileEvent::upload($targetItem));
	}

	public function search($parent, $text, $rqData) {
		if ($parent == NULL) {
			$m = array();
			foreach ($this->getRootFolders() as $id => $root) {
				$data = array();
				foreach ($this->searchers as $searcher) {
					$data[$searcher->key()] = $searcher->preData($root, $text);
				}

				$m = array_merge($m, $this->searchRecursive($data, $root, $text));
			}
		} else {
			$this->itemIdProvider()->load($parent, TRUE);
			$data = array();
			foreach ($this->searchers as $searcher) {
				$data[$searcher->key()] = $searcher->preData($parent, $text);
			}

			$m = $this->searchRecursive($data, $parent, $text);
		}
		$result = array("count" => count($m), "matches" => $m);
		$items = array();
		foreach ($m as $id => $r) {
			$items[] = $r["itm"];
		}
		$result["data"] = $this->env->filesystem()->getRequestData(NULL, $items, $rqData);
		return $result;
	}

	private function searchRecursive($data, $parent, $text) {
		$result = array();

		foreach ($parent->items() as $item) {
			$id = $item->id();

			foreach ($this->searchers as $searcher) {
				$match = $searcher->match($data[$searcher->key()], $item, $text);
				if (!$match) {
					continue;
				}

				if (in_array($id, $result)) {
					$result[$id]["matches"] = array_merge($match, $result[$id]["matches"]);
				} else {
					$result[$id] = array("itm" => $item, "item" => $item->data(), "matches" => $match);
				}
			}
			if (!$item->isFile()) {
				$result = array_merge($result, $this->searchRecursive($data, $item, $text));
			}
		}

		return $result;
	}

	public function setting($setting) {
		return $this->env->settings()->setting($setting);
	}

	public function log() {
		Logging::logDebug("FILESYSTEM: allowed_file_upload_types=" . Util::array2str($this->allowedUploadTypes));
	}

	public function __toString() {
		return "FILESYSTEMCONTROLLER";
	}
}

class FileEvent extends Event {
	const COPY = "copy";
	const RENAME = "rename";
	const MOVE = "move";
	const DELETE = "delete";
	const CREATE_FOLDER = "create_folder";
	const DOWNLOAD = "download";
	const UPLOAD = "upload";
	const VIEW = "view";
	const CREATE_ITEM = "create_item";
	const UPDATE_CONTENT = "update_content";

	private $item;
	private $info;

	static function register($eventHandler) {
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::COPY, "Copy file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::RENAME, "Rename file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::MOVE, "Move file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::DELETE, "Delete file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::CREATE_FOLDER, "Create folder");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::DOWNLOAD, "Download file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::VIEW, "View file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::UPLOAD, "Upload file");
		$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::CREATE_ITEM, "Create item");
	}

	static function rename($item, $to) {
		return new FileEvent($item, self::RENAME, array("to" => $to));
	}

	static function copy($item, $target, $replace = FALSE) {
		return new FileEvent($item, self::COPY, array("to" => $target, "targets" => array($target), "replace" => $replace));
	}

	static function move($item, $to, $target, $replace = FALSE) {
		return new FileEvent($item, self::MOVE, array("to" => $to, "targets" => array($target), "replace" => $replace));
	}

	static function delete($item) {
		return new FileEvent($item, self::DELETE);
	}

	static function createItem($item) {
		return new FileEvent($item, self::CREATE_ITEM);
	}

	static function createFolder($folder) {
		return new FileEvent($folder, self::CREATE_FOLDER);
	}

	static function download($item) {
		return new FileEvent($item, self::DOWNLOAD);
	}

	static function upload($item) {
		return new FileEvent($item, self::UPLOAD);
	}

	static function updateContent($item) {
		return new FileEvent($item, self::UPDATE_CONTENT);
	}

	static function view($item) {
		return new FileEvent($item, self::VIEW);
	}

	function __construct($item, $type, $info = NULL) {
		parent::__construct(time(), FileSystemController::EVENT_TYPE_FILE, $type);
		$this->item = $item;
		$this->info = $info;
	}

	public function items() {
		return array($this->item);
	}

	public function item() {
		return $this->item;
	}

	public function info() {
		return $this->info;
	}

	public function itemToStr() {
		return $this->item->internalPath();
	}

	public function details() {
		$f = $this->item->id();

		if ($this->subType() === self::RENAME or $this->subType() === self::COPY or $this->subType() === self::MOVE) {
			return 'item id=' . $f . ';to=' . $this->info["to"]->id();
		}

		return 'item id=' . $f;
	}

	public function values($formatter) {
		$values = parent::values($formatter);
		$values["item_id"] = $this->item->id();
		$values["item_name"] = $this->item->name();
		$values["item_path"] = $this->item->path();
		$values["item_internal_path"] = $this->item->internalPath();
		$values["root_name"] = $this->item->root()->name();

		if ($this->subType() === self::RENAME or $this->subType() === self::COPY or $this->subType() === self::MOVE) {
			$to = $this->info["to"];

			$values["to_item_id"] = $to->id();
			$values["to_item_name"] = $to->name();
			$values["to_item_path"] = $to->path();
			$values["to_item_internal_path"] = $to->internalPath();
			$values["to_root_name"] = $to->root()->name();
		}

		return $values;
	}

	public function __toString() {
		return "FILESYSTEMEVENT " . get_class($this);
	}
}

class MultiFileEvent extends Event {
	private $items;

	static function download($items) {
		return new MultiFileEvent($items, FileSystemController::EVENT_TYPE_FILE, FileEvent::DOWNLOAD);
	}

	static function copy($items, $to, $targets = NULL, $replace = FALSE) {
		return new MultiFileEvent($items, FileSystemController::EVENT_TYPE_FILE, FileEvent::COPY, array("to" => $to, "targets" => $targets, "replace" => $replace));
	}

	static function move($items, $to, $targets = NULL, $replace = FALSE) {
		return new MultiFileEvent($items, FileSystemController::EVENT_TYPE_FILE, FileEvent::MOVE, array("to" => $to, "targets" => $targets, "replace" => $replace));
	}

	static function delete($items) {
		return new MultiFileEvent($items, FileSystemController::EVENT_TYPE_FILE, FileEvent::DELETE);
	}

	function __construct($items, $type, $subtype, $info = NULL) {
		parent::__construct(time(), $type, $subtype);
		$this->items = $items;
		$this->info = $info;
	}

	public function items() {
		return $this->items;
	}

	public function item() {
		return $this->items;
	}

	public function info() {
		return $this->info;
	}

	public function itemToStr() {
		$f = "";
		foreach ($this->items as $i) {
			$f .= $i->internalPath() . ",";
		}
		return rtrim($f, ",");
	}

	public function details() {
		$f = "";
		foreach ($this->items as $i) {
			$f .= $i->id() . ",";
		}
		return 'item id=' . rtrim($f, ",");
	}

	public function values($formatter) {
		$values = parent::values($formatter);
		$values["item_id"] = "";
		$values["item_name"] = "";
		$values["item_path"] = "";
		$values["item_internal_path"] = "";
		$values["root_name"] = "";

		foreach ($this->items as $i) {
			$values["item_id"] .= $i->id() . ",";
			$values["item_name"] .= $i->name() . ",";
			$values["item_path"] .= $i->path() . ",";
		}
		$values["item_id"] = rtrim($values["item_id"], ",");
		$values["item_name"] = rtrim($values["item_name"], ",");
		$values["item_path"] = rtrim($values["item_path"], ",");

		return $values;
	}

	public function __toString() {
		return "FILESYSTEMEVENT MULTI " . get_class($this);
	}
}

?>
