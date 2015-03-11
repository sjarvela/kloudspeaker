<?php

/**
 * FilesystemItem.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

abstract class FilesystemItem {
	protected $id;
	protected $path;
	protected $filesystem;

	function __construct($id, $rootId, $path, $name, $filesystem) {
		$this->id = $id;
		$this->rootId = $rootId;
		$this->path = ltrim($path, DIRECTORY_SEPARATOR);
		$this->name = $name;
		$this->filesystem = $filesystem;
	}

	abstract function isFile();

	public function id() {
		return $this->id;
	}

	public function rootId() {
		return $this->rootId;
	}

	public function exists() {
		return $this->filesystem->itemExists($this);
	}

	public function internalPath() {
		return $this->filesystem->internalPath($this);
	}

	public function root() {
		return $this->filesystem->root();
	}

	public function parent() {
		return $this->filesystem->parent($this);
	}

	public function hierarchy() {
		return $this->filesystem->hierarchy($this);
	}

	public function name() {
		return $this->name;
	}

	public function location() {
		return $this->filesystem->itemLocation($this->path);
	}

	public function path() {
		return $this->path;
	}

	public function lastModified() {
		return $this->filesystem->lastModified($this);
	}

	public function folderPath() {
		return $this->filesystem->folderPath($this);
	}

	public function details() {
		return $this->filesystem->details($this);
	}

	public function filesystem() {
		return $this->filesystem;
	}

	public function copy($to) {
		return $this->filesystem->copy($this, $to);
	}

	public function move($to) {
		return $this->filesystem->move($this, $to);
	}

	public function rename($name) {
		return $this->filesystem->rename($this, $name);
	}

	public function delete() {
		return $this->filesystem->delete($this);
	}

	public function addTo($c) {
		return $this->filesystem->addTo($this, $c);
	}

	public function isRoot() {
		return FALSE;
	}

	public function create() {
		return $this->filesystem->createNewItem($this);
	}

	public function data() {
		$p = $this->parent();
		return array(
			"id" => $this->id,
			"root_id" => $this->rootId(),
			"parent_id" => ($p != NULL) ? $p->id() : "",
			"name" => $this->name,
			"path" => $this->path,
			"is_file" => $this->isFile(),
		);
	}

	public function __toString() {
		return "FILESYSTEMITEM " . get_class($this) . " (" . get_class($this->filesystem) . "): [" . $this->id . "] = '" . $this->name . "' (" . $this->path . ")";
	}
}

class File extends FilesystemItem {

	public function isFile() {return TRUE;}

	public function size() {
		return $this->filesystem->size($this);
	}

	public function extension() {
		return $this->filesystem->extension($this);
	}

	public function read() {
		return $this->filesystem->read($this);
	}

	public function write($s, $append) {
		return $this->filesystem->write($this, $s, $append);
	}

	public function put($content) {
		return $this->filesystem->put($this, $content);
	}

	public function data() {
		$result = FilesystemItem::data();
		$result["size"] = $this->size();
		$result["extension"] = $this->extension();

		return $result;
	}
}

class Folder extends FilesystemItem {
	public function isFile() {return FALSE;}

	public function items() {
		return $this->filesystem->items($this);
	}

	public function fileWithName($name) {
		return $this->filesystem->fileWithName($this, $name);
	}

	public function folderWithName($name) {
		return $this->filesystem->folderWithName($this, $name);
	}

	public function fileExists($name) {
		return $this->filesystem->fileExists($this, $name);
	}

	public function folderExists($name) {
		return $this->filesystem->folderExists($this, $name);
	}

	public function isRoot() {
		return strcmp($this->id, $this->rootId) === 0;
	}

	public function createFile($name) {
		return $this->filesystem->createFile($this, $name);
	}

	public function createFolder($name) {
		return $this->filesystem->createFolder($this, $name);
	}

	public function calculateRecursiveSize() {
		return $this->filesystem->calculateRecursiveSize($this);
	}
}
?>