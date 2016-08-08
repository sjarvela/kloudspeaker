<?php

	/**
	 * FolderEvent.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class FolderEvent extends Event {
		const EVENT_TYPE_FOLDER = "folder";
		
		const FOLDER_ADD = "add-folder";
		const FOLDER_REMOVE = "remove-folder";
		
		private $id;
		private $folder;

		static function register($eventHandler) {
			$eventHandler->registerEventType(self::EVENT_TYPE_FOLDER, self::FOLDER_ADD, "Folder added");
			$eventHandler->registerEventType(self::EVENT_TYPE_FOLDER, self::FOLDER_REMOVE, "Folder removed");
		}

		static function folderAdded($folder) {
			return new FolderEvent(self::FOLDER_ADD, $folder);
		}

		static function folderRemoved($folder) {
			return new FolderEvent(self::FOLDER_REMOVE, $folder);
		}

		function __construct($type, $folder) {
			parent::__construct(time(), self::EVENT_TYPE_FOLDER, $type);
			$this->id = $folder["id"];
			$this->folder = $folder;
		}
		
		public function id() {
			return $this->id;
		}

		public function folderId() {
			return $this->id;
		}
		
		public function folder() {
			return $this->folder;
		}

		public function details() {
			return 'folder id='.$this->id.";folder name=".$this->folder["name"].";folder path=".$this->folder["path"];
		}
		
		public function values($formatter) {
			$values = parent::values($formatter);
			$values["folder_id"] = $this->id;
			$values["folder_name"] = $this->folder["name"];
			$values["folder_path"] = $this->folder["path"];
			return $values;
		}
		
		public function __toString() {
			return "FOLDEREVENT ".get_class($this);
		}
	}
?>