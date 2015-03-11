<?php

/**
 * ArchiverServices.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ArchiverServices extends ServicesBase {
	protected function isValidPath($method, $path) {
		return count($path) > 0;
	}

	public function isAuthenticationRequired() {
		return TRUE;
	}

	public function processGet() {
		$action = $this->path[0];
		if (!in_array($action, array("download"))) {
			throw $this->invalidRequestException();
		}

		if (count($this->path) > 2) {
			throw $this->invalidRequestException();
		}

		if (!$this->archiveManager()->isActionEnabled("download")) {
			throw $this->invalidRequestException();
		}

		if (count($this->path) == 1) {
			If (!$this->request->hasParam("item")) {
				throw $this->invalidRequestException();
			}

			$itemId = $this->request->param("item");
			$item = $this->item($itemId);
			$this->env->filesystem()->assertRights($item, FilesystemController::PERMISSION_LEVEL_READ, "compress");
			$a = $this->archiveManager()->compress($item);
			$name = $item->name() . ".zip";
		} else {
			$id = $this->path[1];
			$a = $this->env->session()->param("archive_" . $id);
			if (!$a) {
				throw $this->invalidRequestException();
			}

			$name = FALSE;
			if ($this->env->session()->hasParam("archive_" . $id . "_name")) {
				$name = $this->env->session()->param("archive_" . $id . "_name") . ".zip";
			}

			if (!$name) {
				$name = "download.zip";
			}
		}

		$handle = @fopen($a, "rb");
		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open zip for reading: " . $a);
		}

		$this->env->response()->download($name, 'zip', FALSE, $handle);
		unlink($a);
	}

	public function processPost() {
		$action = $this->path[0];

		if (!in_array($action, array("extract", "compress", "download"))) {
			throw $this->invalidRequestException();
		}

		if (!$this->archiveManager()->isActionEnabled($action)) {
			throw $this->invalidRequestException();
		}

		if ($action === 'extract') {
			$this->onExtract();
		} else if ($action === 'compress') {
			$this->onCompress();
		} else if ($action === 'download') {
			$this->onDownloadCompressed();
		}
		//else {
		//	$this->onPack();
		//}
	}

	private function onCompress() {
		$data = $this->request->data;
		if (!array_key_exists("items", $data)) {
			throw $this->invalidRequestException();
		}

		$items = $data['items'];
		if (count($items) < 1 || !array_key_exists("folder", $data) || !array_key_exists("name", $data) || strlen($data["name"]) == 0) {
			throw $this->invalidRequestException();
		}

		$folder = $this->item($data['folder']);
		$this->env->filesystem()->assertRights($folder, FilesystemController::PERMISSION_LEVEL_READWRITE, "compress");

		$items = array();
		foreach ($data['items'] as $i) {
			$items[] = $this->item($i);
		}

		if (count($items) == 0) {
			throw $this->invalidRequestException();
		}

		$this->env->filesystem()->assertRights($items, FilesystemController::PERMISSION_LEVEL_READ, "compress");

		$ext = ".zip";//TODO
		$extl = strlen($ext);

		$name = $data["name"];
		if (strlen($name) > $extl && substr($name, -$extl) === $ext) {
			$name = substr($name, 0, strlen($name) - $extl);
		}

		$name = str_replace(".", "_", $name) . $ext;
		$target = $folder->fileWithName($name);
		//$target = rtrim($folder->internalPath(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name . $ext;

		if ($target->exists()) {
			throw new ServiceException("FILE_ALREADY_EXISTS", $target);
		}

		$this->env->filesystem()->validateAction(FileEvent::CREATE_ITEM, $target);
		$this->env->filesystem()->triggerActionInterceptor(FileEvent::CREATE_ITEM, $target);

		$this->archiveManager()->compress($items, $target->internalPath());
		$this->env->events()->onEvent(FileEvent::createItem($target));

		$this->response()->success(array());
	}

	private function onDownloadCompressed() {
		$data = $this->request->data;
		if (!array_key_exists("items", $data)) {
			throw $this->invalidRequestException();
		}

		if (!is_array($data['items']) || count($data['items']) < 1) {
			throw $this->invalidRequestException();
		}

		$items = array();
		$name = FALSE;
		foreach ($data['items'] as $i) {
			$items[] = $this->item($i);
		}

		if (count($items) == 0) {
			throw $this->invalidRequestException();
		}

		if (count($items) == 1) {
			$name = $items[0]->name();
		}

		$this->env->filesystem()->assertRights($items, FilesystemController::PERMISSION_LEVEL_READ, "download compressed");

		$a = $this->archiveManager()->compress($items);
		$id = uniqid();
		$this->env->session()->param("archive_" . $id, $a);
		if ($name) {
			$this->env->session()->param("archive_" . $id . "_name", $name);
		}

		if (is_array($items)) {
			$this->env->events()->onEvent(MultiFileEvent::download($items));
		} else {
			$this->env->events()->onEvent(FileEvent::download($items));
		}

		$this->response()->success(array("id" => $id));
	}

	private function onExtract() {
		$data = $this->request->data;
		if (!array_key_exists("item", $data)) {
			throw $this->invalidRequestException();
		}

		$overwrite = isset($data['overwrite']) ? $data['overwrite'] : FALSE;
		$archive = $this->item($data["item"]);
		$this->env->filesystem()->assertRights($archive, FilesystemController::PERMISSION_LEVEL_READ, "extract");

		$parent = NULL;
		if (isset($data["folder"])) {
			$this->item($data["folder"]);
		} else {
			$parent = $archive->parent();
		}

		$this->env->filesystem()->assertRights($parent, FilesystemController::PERMISSION_LEVEL_READWRITE, "extract");

		$name = str_replace(".", "_", basename($archive->internalPath()));
		$target = $parent->folderWithName($name);
		if ($target->exists() and !$overwrite) {
			throw new ServiceException("DIR_ALREADY_EXISTS", $target);
		}

		//$target = $parent->internalPath() . DIRECTORY_SEPARATOR . $name . DIRECTORY_SEPARATOR;

		$this->env->filesystem()->validateAction(FileEvent::CREATE_ITEM, $target);
		$this->env->filesystem()->triggerActionInterceptor(FileEvent::CREATE_ITEM, $target);

		if ($target->exists() and $overwrite) {
			$target->delete();
		}

		$this->env->filesystem()->createItem($target);

		$this->archiveManager()->extract($archive->internalPath(), $target->internalPath());
		$this->env->events()->onEvent(FileEvent::createItem($target));

		$this->response()->success(array());
	}

	private function archiveManager() {
		return $this->env->plugins()->getPlugin("Archiver")->getArchiveManager();
	}

	public function __toString() {
		return "ArchiverServices";
	}
}
?>