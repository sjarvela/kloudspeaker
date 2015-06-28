<?php

	/**
	 * KloudspeakerFilesystem.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	abstract class KloudspeakerFilesystem {		
		protected $id;
		protected $name;
		protected $filesystemInfo;
		
		function __construct($id, $name, $filesystemInfo) {
			$this->id = $id;
			$this->name = $name;
			$this->filesystemInfo = $filesystemInfo;
		}

		public function allowUnassigned() {
			return FALSE;
		}
		
		abstract function type();
		
		abstract function exists();
		
		abstract function create();

		public abstract function createItem($id, $path);
				
		public abstract function items($parent);
		
		public abstract function parent($item);
		
		public abstract function size($file);
		
		public abstract function lastModified($item);
		
		public abstract function rename($item, $name);
		
		public abstract function copy($item, $to);
		
		public abstract function move($item, $to);
		
		public abstract function delete($item);
		
		public abstract function read($item, $range = NULL);
		
		public abstract function write($item, $s);
		
		public abstract function put($item, $content);
				
		public abstract function createFolder($folder, $name);
		
		public abstract function createFile($folder, $name);
		
		public abstract function fileWithName($folder, $name);

		public abstract function folderWithName($folder, $name);
		
		public abstract function itemExists($item);
		
		public function id() {
			return $this->id;
		}

		protected function rootId() {
			return $this->itemId('');
		}

		public function itemId($path) {
			return $this->filesystemInfo->itemIdProvider()->getItemId($this->itemLocation($path));
		}

		public function itemLocation($path) {
			return $this->id().":".DIRECTORY_SEPARATOR.$path;
		}
		
		public function name() {
			return $this->name;
		}
				
		public function root() {
			return new Folder($this->itemId(''), $this->rootId(), '', $this->name, $this);
		}
		
		public function details($item) {
			return array();
		}
				
		protected function isItemIgnored($parentPath, $name, $path) {
			return $this->filesystemInfo->isItemIgnored($this, $parentPath, $name, $path);
		}
		
		protected function itemWithPath($path) {
			return $this->createItem($this->itemId($path), $path);
		}
		
		protected function internalTimestampFormat() {
			return $this->filesystemInfo->env()->configuration()->internalTimestampFormat();
		}

		public function __toString() {
			return get_class($this)." (".$this->id.") ".$this->name;
		}
	}
	
	class NonExistingFolderException extends ServiceException {}
?>