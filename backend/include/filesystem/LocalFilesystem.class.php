<?php

/**
 * LocalFilesystem.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class LocalFilesystem extends KloudspeakerFilesystem {
	const FS_TYPE = "local";

	private $rootPath;

	function __construct($id, $def, $filesystemInfo) {
		parent::__construct($id, $def['name'] != NULL ? $def['name'] : $def['default_name'], $filesystemInfo);
		if ($def == NULL or !isset($def["path"])) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid filesystem definition");
		}

		$this->rootPath = self::folderPath($def["path"]);
	}

	public function isWritable() {
		return is_writable($this->rootPath);
	}

	public function isDirectDownload() {
		return TRUE;
	}

	public function assert() {
		if (!$this->exists()) {
			throw new NonExistingFolderException("INVALID_CONFIGURATION", "Invalid folder definition, path does not exist [" . $this->id() . "]");
		}
	}

	public function exists() {
		return file_exists($this->filesystemInfo->env()->convertCharset($this->rootPath, FALSE));
	}

	public function create() {
		$rootPath = $this->filesystemInfo->env()->convertCharset($this->rootPath, FALSE);

		if (!mkdir($rootPath, 0755)) {
			return FALSE;
		}

		if ($this->filesystemInfo->env()->features()->isFeatureEnabled("folder_protection")) {
			copy($this->filesystemInfo->env()->getScriptRootPath() . "/include/apache/htaccess", $rootPath . '.htaccess');
		}
		return TRUE;
	}

	public function type() {
		return KloudspeakerFilesystem::TYPE_LOCAL;
	}

	public function createItem($id, $path) {
		self::assertPath($path);

		$fullPath = self::joinPath($this->rootPath, $path);
		$isFile = (strcasecmp(substr($fullPath, -1), DIRECTORY_SEPARATOR) != 0);

		$name = $this->itemName(dirname($path), self::basename($fullPath), $fullPath);

		if ($isFile)
			return new File($id, $this->rootId(), $path, $name, $this);
		return new Folder($id, $this->rootId(), $path, $name, $this);
	}

	private function publicPath($path) {
		return ltrim(substr($path, strlen($this->rootPath)), DIRECTORY_SEPARATOR);
	}

	public function internalPath($item) {
		return self::joinPath($this->rootPath, $item->path());
	}

	/* Returns item path in native charset */
	public function localPath($item) {
		return $this->filesystemInfo->env()->convertCharset($item->internalPath(), FALSE);
	}

	public function itemExists($item) {
		return file_exists($this->localPath($item));
	}

	public function details($item) {
		$datetimeFormat = $this->internalTimestampFormat();

		$details = array("id" => $item->id());
		if ($item->isFile()) {
			$path = $this->localPath($item);
			$details["last_changed"] = date($datetimeFormat, filectime($path));
			$details["last_modified"] = date($datetimeFormat, filemtime($path));
			$details["last_accessed"] = date($datetimeFormat, fileatime($path));
		}
		return $details;
	}

	public function extension($item) {
		if (!$item->isFile()) {
			return NULL;
		}

		$extPos = strrpos($item->name(), '.');
		if ($extPos > 0) {
			return substr($item->name(), $extPos + 1);
		}

		return "";
	}

	public function items($parent) {
		$parentPath = $this->internalPath($parent);
		$nativeParentPath = $this->localPath($parent);

		$items = scandir($nativeParentPath);
		if (!$items) {
			throw new ServiceException("INVALID_PATH", $parent->id());
		}

		//$ignored = $this->ignoredItems($this->publicPath($parentPath));

		$result = array();
		foreach ($items as $i => $name) {
			if ($name == "." or $name == ".." or (strcmp(substr($name, 0, 1), '.') == 0)) {
				continue;
			}

			//if (in_array(strtolower($name), $ignored)) {
			//	continue;
			//}

			$path = self::joinPath($parentPath, $this->filesystemInfo->env()->convertCharset($name));
			$nativePath = self::joinPath($nativeParentPath, $name);
			if ($this->isItemIgnored($parentPath, $name, $nativePath)) continue;

			$itemName = $this->itemName($parentPath, $name, $nativePath);
			if (!$itemName) continue;

			if (is_link($nativePath) and !file_exists($nativePath)) {
				Logging::logError("Symbolic link broken: " . $nativePath);
				continue;
			}

			if (!is_dir($nativePath)) {
				$p = $this->publicPath($path);
				$result[] = new File($this->itemId($p), $this->rootId(), $p, $itemName, $this);
			} else {
				$p = $this->publicPath(self::folderPath($path));
				$result[] = new Folder($this->itemId($p), $this->rootId(), $p, $itemName, $this);
			}
		}

		return $result;
	}

	protected function itemName($parentPath, $name, $nativePath) {
		return $this->filesystemInfo->env()->convertCharset($name);
	}

	public function calculateRecursiveSize($folder) {
		return $this->folderSizeRecursively($this->localPath($folder));
	}

	/* nativePath assumes path in local charset, not utf8 */
	private function folderSizeRecursively($nativePath) {
		$files = scandir($nativePath);
		if (!$files) {
			throw new ServiceException("INVALID_PATH", $this->path);
		}

		//$ignored = $this->ignoredItems($this->publicPath($nativePath));
		$size = 0;

		foreach ($files as $i => $name) {
			if (substr($name, 0, 1) == '.') {
				continue;
			}

			$fullPath = self::joinPath($nativePath, $name);
			if ($this->isItemIgnored($nativePath, $name, $fullPath)) continue;

			if (is_link($fullPath) and !file_exists($fullPath)) {
				Logging::logError("Symbolic link broken: " . $fullPath);
				continue;
			}
			if (is_dir($fullPath)) {
				$size = $size + $this->folderSizeRecursively($fullPath);
				continue;
			}

			$size = $size + filesize($fullPath);
		}
		return $size;
	}

	public function hierarchy($item) {
		$result = array();
		$result[] = $item->root();

		$to = $item->isFile() ? $item->parent() : $item;
		$toPath = $this->internalPath($to);

		$parts = preg_split("/[\/\\\\]+/", substr($toPath, strlen($this->rootPath)), -1, PREG_SPLIT_NO_EMPTY);
		$current = $this->rootPath;

		foreach ($parts as $part) {
			$current .= $part . DIRECTORY_SEPARATOR;

			$public = $this->publicPath(self::folderPath($current));
			$itemId = $this->itemId($public);

			$result[] = new Folder($itemId, $this->rootId(), $public, rtrim($part, "/\\"), $this);
		}

		return $result;
	}

	/* nativePath assumes path in local charset, not utf8 */
	private function allFilesRecursively($nativePath) {
		$files = scandir($nativePath);
		if (!$files) {
			throw new ServiceException("INVALID_PATH", $this->path);
		}

		//$ignored = $this->ignoredItems($this->publicPath($nativePath));
		$result = array();

		foreach ($files as $i => $name) {
			if (substr($name, 0, 1) == '.') {
				continue;
			}

			$fullPath = self::joinPath($nativePath, $name);
			if ($this->isItemIgnored($nativePath, $name, $fullPath)) continue;

			if (is_dir($fullPath)) {
				$result = array_merge($result, $this->allFilesRecursively($fullPath));
				continue;
			}

			$result[] = $fullPath;
		}
		return $result;
	}

	public function parent($item) {
		if ($item->path() === '') {
			return NULL;
		}

		$parentPath = self::folderPath(dirname($item->internalPath()));
		return $this->itemWithPath($this->publicPath($parentPath));
	}

	public function createNewItem($item) {
		$parent = $item->parent();
		if ($item->isFile()) {
			return $this->createFile($parent, $item->name());
		} else {
			return $this->createFolder($parent, $item->name());
		}
	}

	public function rename($item, $name) {
		self::assertFilename($name);

		$old = $this->internalPath($item);
		$nativeOld = $this->filesystemInfo->env()->convertCharset($old, FALSE);

		$new = self::joinPath(dirname($old), $name);
		$nativeNew = $this->filesystemInfo->env()->convertCharset($new, FALSE);

		if (!$item->isFile()) {
			$new = self::folderPath($new);
		}

		if (file_exists($nativeNew)) {
			throw new ServiceException("FILE_ALREADY_EXISTS", "Failed to rename [" . $item->id() . "], target already exists (" . $new . ")");
		}

		if (!rename($nativeOld, $nativeNew)) {
			throw new ServiceException("REQUEST_FAILED", "Failed to rename [" . $item->id() . "]");
		}

		return $this->createItem($item->id(), $this->publicPath($new));
	}

	public function copy($item, $to) {
		$nativeTarget = $this->localPath($to);

		if (file_exists($nativeTarget)) {
			throw new ServiceException("FILE_ALREADY_EXISTS", "Failed to copy [" . $item->id() . "] to [" . $to->id() . "], target already exists (" . $nativeTarget . ")");
		}

		$result = FALSE;
		$nativePath = $this->localPath($item);

		Logging::logDebug("copy [" . $nativePath . "] -> [" . $nativeTarget . "]");
		if ($item->isFile()) {
			$result = copy($nativePath, $nativeTarget);
		} else {
			$result = $this->copyFolderRecursively($nativePath, $nativeTarget);
		}
		if (!$result) {
			throw new ServiceException("REQUEST_FAILED", "Failed to copy [" . $item->id() . " to " . $to->id() . "]");
		}

		return $to;
	}

	/* assumes paths are native charset, not utf8 */
	private function copyFolderRecursively($from, $to) {
		$dir = opendir($from);

		@mkdir($to);

		while (false !== ($item = readdir($dir))) {

			if (($item == '.') or ($item == '..')) {
				continue;
			}

			$source = $from . DIRECTORY_SEPARATOR . $item;
			$target = $to . DIRECTORY_SEPARATOR . $item;

			if (is_dir($source)) {
				$this->copyFolderRecursively($source, $target);
			} else {
				copy($source, $target);
			}
		}

		closedir($dir);
		return TRUE;

	}

	public function move($item, $to) {
		$target = self::joinPath($to->internalPath(), $item->name());
		if (!$item->isFile()) {
			$target = self::folderPath($target);
		}

		$nativeTarget = $this->filesystemInfo->env()->convertCharset($target, FALSE);
		if (file_exists($nativeTarget)) {
			throw new ServiceException("FILE_ALREADY_EXISTS", "Failed to move [" . $item->id() . "] to [" . $to->id() . "], target already exists (" . $target . ")");
		}

		$nativeFrom = $this->localPath($item);
		if (!rename($nativeFrom, $nativeTarget)) {
			throw new ServiceException("REQUEST_FAILED", "Failed to move [" . $item->id() . "] to " . $target);
		}

		$newPath = self::joinPath($to->path(), $item->name());
		if (!$item->isFile()) {
			$newPath = self::folderPath($newPath);
		}
		return $to->filesystem()->createItem($item->id(), $newPath);
	}

	public function delete($item) {
		if ($item->isFile()) {
			if (!unlink($this->localPath($item))) {
				throw new ServiceException("REQUEST_FAILED", "Cannot delete [" . $item->id() . "]");
			}
		} else {
			$this->deleteFolderRecursively($this->localPath($item));
		}
	}

	/* assumes native path, not utf8 */
	private function deleteFolderRecursively($path) {
		$path = self::folderPath($path);
		$handle = opendir($path);

		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open directory for traversal (recurse): " . $path);
		}

		while (false !== ($item = readdir($handle))) {
			if ($item != "." and $item != "..") {
				$fullpath = $path . $item;

				if (is_dir($fullpath)) {
					$this->deleteFolderRecursively($fullpath);
				} else {
					if (!unlink($fullpath)) {
						closedir($handle);
						throw new ServiceException("REQUEST_FAILED", "Failed to remove file (recurse): " . $fullpath);
					}
				}
			}
		}

		closedir($handle);

		if (!rmdir($path)) {
			throw new ServiceException("REQUEST_FAILED", "Failed to remove directory (delete_directory_recurse): " . $path);
		}
	}

	public function createFolder($folder, $name) {
		self::assertFilename($name);

		$path = self::folderPath(self::joinPath($this->internalPath($folder), $name));
		$nativePath = $this->filesystemInfo->env()->convertCharset($path, FALSE);

		if (file_exists($nativePath)) {
			throw new ServiceException("DIR_ALREADY_EXISTS", $folder->id() . "/" . $name);
		}

		$mask = $this->filesystemInfo->setting("new_folder_permission_mask");
		if ($mask === FALSE) {
			if (!mkdir($nativePath)) {
				throw new ServiceException("CANNOT_CREATE_FOLDER", $folder->id() . "/" . $name);
			}
		} else {
			if (!mkdir($nativePath, $mask)) {
				throw new ServiceException("CANNOT_CREATE_FOLDER", $folder->id() . "/" . $name);
			} else {
				chmod($nativePath, $mask);
			}
		}
		return $this->itemWithPath($this->publicPath($path));
	}

	public function createFile($folder, $name) {
		self::assertFilename($name);

		$target = self::joinPath($this->internalPath($folder), $name);
		$nativeTarget = $this->filesystemInfo->env()->convertCharset($target, FALSE);
		Logging::logDebug("create " . $target . ": " . $this->publicPath($target));

		if (file_exists($nativeTarget)) {
			throw new ServiceException("FILE_ALREADY_EXISTS");
		}
		touch($nativeTarget);

		return $this->itemWithPath($this->publicPath($target));
	}

	public function fileWithName($folder, $name) {
		self::assertFilename($name);

		$path = self::joinPath($this->publicPath($folder->internalPath()), $name);
		return $this->itemWithPath($path);
	}

	public function folderWithName($folder, $name) {
		self::assertFilename($name);

		$path = self::folderPath(self::joinPath($folder->internalPath(), $name));
		return $this->itemWithPath($this->publicPath($path));
	}

	public function fileExists($folder, $name) {
		self::assertFilename($name);
		return file_exists(self::joinPath($folder->internalPath(), $name));
	}

	public function folderExists($folder, $name) {
		self::assertFilename($name);
		return file_exists(self::folderPath(self::joinPath($folder->internalPath(), $name)));
	}

	public function size($file, $forceString = FALSE) {
		$p = $this->localPath($file);
		if (!file_exists($p)) {
			return NULL;
		}
		if ($forceString) {
			return sprintf("%u", filesize($p));
		}
		return filesize($p);
	}

	public function lastModified($item) {
		return filemtime($this->localPath($item));
	}

	public function read($item, $range = NULL) {
		$handle = @fopen($this->localPath($item), "rb");
		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open file for reading: " . $item->id());
		}

		return $handle;
	}

	public function write($item, $s, $append = FALSE) {
		$handle = @fopen($this->localPath($item), ($append ? "ab" : "wb"));
		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open file for writing: " . $item->id());
		}

		while (!feof($s)) {
			set_time_limit(0);
			fwrite($handle, fread($s, 1024));
		}
		fclose($handle);
	}

	public function put($item, $content) {
		file_put_contents($this->localPath($item), $content);
	}

	public function addTo($item, $c) {
		$nativePath = $this->localPath($item);

		if ($item->isFile()) {
			$c->add($item->name(), $nativePath, $item->size());
		} else {
			if ($c->acceptFolders()) {
				$c->add($item->name(), $nativePath);
			} else {
				$offset = strlen($this->localPath($item)); // - strlen($item->name()) - 1;
				$name = $item->name();

				$files = $this->allFilesRecursively($nativePath); //TODO rights!
				if (count($files) > 0) {
					foreach ($files as $file) {
						$st = stat($file);
						$c->add($name . DIRECTORY_SEPARATOR . $this->filesystemInfo->env()->convertCharset(substr($file, $offset)), $file, $st['size']);
					}
				} else {
					$c->addEmptyDir($item->name());
				}
			}
		}
	}

	public function __toString() {
		return "LOCAL (" . $this->id . ") " . $this->name . "(" . $this->rootPath . ")";
	}

	public static function assertFilename($name) {
		if (strlen($name) == 0) {
			return;
		}

		if (strpos($name, "..\\") !== FALSE or strpos($name, "../") !== FALSE) {
			throw new ServiceException("INVALID_REQUEST", "Invalid name [" . $name . "]");
		}

		if (strpos($name, "\\") !== FALSE or strpos($name, "/") !== FALSE) {
			throw new ServiceException("INVALID_REQUEST", "Invalid name [" . $name . "]");
		}

		//TODO validate invalid chars?
	}

	public static function assertPath($path) {
		if (strlen($path) == 0) {
			return;
		}

		if (strpos($path, "..\\") !== FALSE or strpos($path, "../") !== FALSE) {
			throw new ServiceException("INVALID_REQUEST", "Invalid path [" . $path . "]");
		}
	}

	static function joinPath($item1, $item2) {
		$i2 = ltrim($item2, DIRECTORY_SEPARATOR);
		if (strlen($item1) == 0) {
			return $i2;
		}

		return self::folderPath($item1) . $i2;
	}

	static function folderPath($path) {
		return rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
	}

	static function basename($path) {
		$name = strrchr(rtrim($path, DIRECTORY_SEPARATOR), DIRECTORY_SEPARATOR);
		if (!$name) {
			return "";
		}

		return substr($name, 1);
	}
}

class LocalFilesystemFactory {
	public function createFilesystem($id, $folderDef, $controller) {
		return new LocalFilesystem($id, $folderDef, $controller);
	}
}
?>