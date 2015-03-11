<?php

/**
 * FilesystemServices.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class FilesystemServices extends ServicesBase {
	protected function isValidPath($method, $path) {
		if (count($path) < 1 or count($path) > 3) {
			return FALSE;
		}

		return TRUE;
	}

	public function processGet() {
		$item = $this->item($this->path[0]);
		if ($item->isFile()) {
			$this->processGetFile($item);
		} else {
			$this->processGetFolder($item);
		}
	}

	public function processPut() {
		$item = $this->item($this->path[0]);
		if ($item->isFile()) {
			$this->processPutFile($item);
		} else {
			$this->processPutFolder($item);
		}
	}

	public function processPost() {
		if ($this->path[0] === 'find') {
			$this->processFind();
			return;
		}
		if ($this->path[0] === 'items') {
			$this->processMultiItemAction();
			return;
		}
		if ($this->path[0] === 'search') {
			$data = $this->request->data;
			if (!isset($data['text'])) {
				throw $this->invalidRequestException();
			}

			$this->response()->success($this->env->filesystem()->search(NULL, $data['text'], $data['rq_data']));
			return;
		}

		if ($this->path[0] === 'roots' and $this->path[1] === 'info') {
			$this->response()->success($this->getFolderInfo(NULL, FALSE, $this->request->data["data"]));
			return;
		}

		$item = $this->item($this->path[0]);
		if ($item->isFile()) {
			$this->processPostFile($item);
		} else {
			$this->processPostFolder($item);
		}
	}

	public function processDelete() {
		if (count($this->path) == 1) {
			$this->env->filesystem()->delete($this->item($this->path[0]));
			$this->response()->success(TRUE);
			return;
		}
		if (count($this->path) == 2 and $this->path[1] === 'description') {
			$this->env->filesystem()->removeDescription($this->item($this->path[0]));
			$this->response()->success(TRUE);
			return;
		}

		throw $this->invalidRequestException();
	}

	private function processMultiItemAction() {
		if (count($this->path) != 1) {
			throw invalidRequestException();
		}

		$data = $this->request->data;
		if (!isset($data['action']) or !isset($data['items']) or count($data['items']) < 1) {
			throw $this->invalidRequestException();
		}

		$items = array();
		foreach ($data['items'] as $i) {
			$items[] = $this->item($i["id"]);
		}

		switch ($data['action']) {
			case 'copy':
				if (!isset($data['to'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->copyItems($items, $this->item($data['to']));
				$this->response()->success(TRUE);
				return;
			case 'move':
				if (!isset($data['to'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->moveItems($items, $this->item($data['to']));
				$this->response()->success(TRUE);
				return;
			case 'delete':
				$this->env->filesystem()->deleteItems($items);
				$this->response()->success(TRUE);
				return;
			default:
				throw $this->invalidRequestException();
		}
	}

	private function processGetFile($item) {
		if (count($this->path) == 1) {
			$mobile = ($this->env->request()->hasParam("m") and strcmp($this->env->request()->param("m"), "1") == 0);
			if (isset($_SERVER['HTTP_RANGE'])) {
				$this->env->filesystem()->download($item, $mobile, $_SERVER['HTTP_RANGE']);
			} else {
				$this->env->filesystem()->download($item, $mobile);
			}
			return;
		}

		switch (strtolower($this->path[1])) {
			case 'thumbnail':
				if (!$item->isFile()) {
					throw $this->invalidRequestException();
				}

				if (!in_array(strtolower($item->extension()), array("gif", "png", "jpg", "jpeg"))) {
					throw $this->invalidRequestException();
				}

				if ($this->env->settings()->setting("enable_thumbnails")) {
					require_once "include/Thumbnail.class.php";
					$maxWidth = 400;
					$maxHeight = 400;
					if ($this->env->request()->hasParam("mw") and $this->env->request()->hasParam("mh")) {
						$maxWidth = intval($this->env->request()->param("mw"));
						$maxHeight = intval($this->env->request()->param("mh"));
					}
					$t = new Thumbnail();
					if ($t->generate($item, $maxWidth, $maxHeight)) {
						die();
					}
				}

				$this->env->filesystem()->view($item);
				return;
			case 'view':
				$this->env->filesystem()->view($item);
				die();
			case 'details':
				$this->response()->success($this->env->filesystem()->details($item));
				break;
			default:
				throw $this->invalidRequestException();
		}
	}

	private function processPutFile($item) {
		if (count($this->path) != 2) {
			throw invalidRequestException();
		}

		$data = $this->request->data;

		switch (strtolower($this->path[1])) {
			case 'name':
				if (!isset($data['name'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->rename($item, $data['name']);
				$this->response()->success(TRUE);
				break;
			case 'description':
				if (!isset($data['description'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->setDescription($item, $data["description"]);
				$this->response()->success(TRUE);
				break;
			default:
				throw $this->invalidRequestException();
		}
	}

	private function processPostFile($item) {
		if (count($this->path) != 2) {
			throw $this->invalidRequestException();
		}

		switch (strtolower($this->path[1])) {
			case 'details':
				$data = isset($this->request->data["data"]) ? $this->request->data["data"] : null;
				$this->response()->success($this->env->filesystem()->details($item, $data));
				return;
			case 'move':
				$data = $this->request->data;
				if (!isset($data['id'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->move($item, $this->item($data['id'], FALSE));
				break;
			case 'copy':
				$data = $this->request->data;
				if (!isset($data['folder']) and !isset($data['name'])) {
					throw $this->invalidRequestException();
				}

				if (isset($data['folder']) and isset($data['name'])) {
					throw $this->invalidRequestException();
				}

				$name = NULL;
				if (isset($data['folder'])) {
					$to = $this->item($data['folder'], FALSE);
				} else {
					$to = $item->parent();
					$name = $data['name'];
				}
				$this->env->filesystem()->copy($item, $to, $name);
				break;
			case 'content':
				$this->env->filesystem()->updateFileContents($item, file_get_contents("php://input"));
				break;
			default:
				throw $this->invalidRequestException();
		}

		$this->response()->success(TRUE);
	}

	private function processGetFolder($item) {
		if (count($this->path) != 2) {
			throw invalidRequestException();
		}

		switch (strtolower($this->path[1])) {
			case 'info':
				$includeHierarchy = ($this->request->hasParam("h") and strcmp($this->request->param("h"), "1") == 0);
				$this->response()->success($this->getFolderInfo($item, $includeHierarchy));
				break;
			case 'files':
				$items = $this->env->filesystem()->items($item);
				$files = array();
				foreach ($items as $i) {
					if ($i->isFile()) {
						$files[] = $i->data();
					}
				}

				$this->response()->success($files);
				break;
			case 'folders':
				$items = $this->env->filesystem()->items($item);
				$folders = array();
				foreach ($items as $i) {
					if (!$i->isFile()) {
						$folders[] = $i->data();
					}
				}

				$this->response()->success($folders);
				break;
			case 'items':
				$items = $this->env->filesystem()->items($item);
				$includeFiles = (!$this->request->hasParam("files") or strcmp($this->request->param("files"), "1") == 0);
				$folders = array();
				$files = array();
				foreach ($items as $i) {
					if ($i->isFile()) {
						if ($includeFiles) {$files[] = $i->data();	}
					} else {
						$folders[] = $i->data();
					}
				}

				$this->response()->success(array("folders" => $folders, "files" => $files));
				break;
			case 'details':
				$this->response()->success($this->env->filesystem()->details($item));
				break;
			default:
				throw $this->invalidRequestException();
		}
	}

	private function getFolderInfo($item, $includeHierarchy, $data = NULL) {
		$items = ($item != NULL) ? $this->env->filesystem()->items($item) : $this->env->filesystem()->getRootFolders();
		$files = array();
		$folders = array();
		foreach ($items as $i) {
			if ($i->isFile()) {
				$files[] = $i->data();
			} else {
				$folders[] = $i->data();
			}
		}

		$result["folder"] = ($item != NULL) ? $item->data() : NULL;
		$result["files"] = $files;
		$result["folders"] = $folders;
		$result["permissions"] = ($item != NULL) ? $this->env->permissions()->getAllFilesystemPermissions($item) : array();
		$result["data"] = $this->env->filesystem()->getRequestData($item, $items, $data);

		if ($includeHierarchy) {
			$h = array();
			foreach ($this->env->filesystem()->hierarchy($item) as $i) {
				$h[] = $i->data();
			}
			$result["hierarchy"] = $h;
		}
		return $result;
	}

	private function processPutFolder($item) {
		if (count($this->path) != 2) {
			throw invalidRequestException();
		}

		$data = $this->request->data;

		switch (strtolower($this->path[1])) {
			case 'name':

				if (!isset($data['name'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->rename($item, $data['name']);
				$this->response()->success(TRUE);
				break;
			case 'description':
				if (!isset($data['description'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->setDescription($item, $data['description']);
				$this->response()->success(TRUE);
				break;
			default:
				throw $this->invalidRequestException();
		}
	}

	private function processPostFolder($item) {
		if (count($this->path) != 2) {
			throw $this->invalidRequestException();
		}

		switch (strtolower($this->path[1])) {
			case 'details':
				$data = isset($this->request->data["data"]) ? $this->request->data["data"] : null;
				$this->response()->success($this->env->filesystem()->details($item, $data));
				return;
			case 'info':
				$includeHierarchy = ($this->request->hasParam("h") and strcmp($this->request->param("h"), "1") == 0);
				$this->response()->success($this->getFolderInfo($item, $includeHierarchy, $this->request->data["data"]));
				return;
			case 'check':
				if (!isset($this->request->data["files"])) {
					throw $this->invalidRequestException();
				}

				$stripped = array();
				foreach ($this->request->data["files"] as $file) {
					$p = strrpos($file, "/");
					if ($p === FALSE) {
						$p = -1;
					}

					$p = max($p, strrpos($file, "\\"));

					if ($p !== FALSE and $p >= 0) {
						$stripped[] = substr($file, $p + 1);
					} else {
						$stripped[] = $file;
					}
				}

				$existing = $this->env->filesystem()->checkExisting($item, $stripped);
				$this->response()->success(array("ok" => (count($existing) == 0), "existing" => $existing));
				return;
			case 'empty_file':
				if (!isset($this->request->data["name"])) {
					throw $this->invalidRequestException();
				}

				$file = $item->fileWithName($this->request->data["name"]);
				$this->response()->success($this->env->filesystem()->createItem($file));
				return;
			case 'files':
				$this->env->filesystem()->uploadTo($item);
				$this->response()->html(json_encode(array("result" => TRUE)));
				die();
				break;
			case 'folders':
				$data = $this->request->data;
				if (!isset($data['name'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->createFolder($item, $data['name']);
				break;
			case 'copy':
				$data = $this->request->data;
				if (!isset($data['folder'])) {
					throw $this->invalidRequestException();
				}

				$folder = $this->item($data['folder']);
				$to = $folder->folderWithName($item->name());
				Logging::logDebug("COPY TO " . $to->internalPath());
				if ($to->exists()) {
					throw new ServiceException("DIR_ALREADY_EXISTS");
				}

				$this->env->filesystem()->copy($item, $to);
				break;
			case 'move':
				$data = $this->request->data;
				if (!isset($data['id'])) {
					throw $this->invalidRequestException();
				}

				$this->env->filesystem()->move($item, $this->item($data['id'], FALSE));
				break;
			case 'retrieve':
				$this->env->features()->assertFeature("retrieve_url");
				$data = $this->request->data;
				if (!isset($data['url'])) {
					throw $this->invalidRequestException();
				}

				$retrieved = $this->env->urlRetriever()->retrieve($data['url']);
				if (!$retrieved["success"]) {
					if ($retrieved["result"] === 404) {
						$this->response()->fail(301, "Resource not found [" . $data['url'] . "]");
					} else if ($retrieved["result"] === 401) {
						$this->response()->fail(302, "Unauthorized");
					} else {
						$this->response()->fail(108, "Failed to retrieve resource [" . $data['url'] . "], http status " . $retrieved["result"]);
					}

					return;
				}
				$this->env->filesystem()->uploadFrom($item, $retrieved["name"], $retrieved["stream"], $data['url']);
				fclose($retrieved["stream"]);
				unlink($retrieved["file"]);
				break;
			case 'search':
				$data = $this->request->data;
				if (!isset($data['text'])) {
					throw $this->invalidRequestException();
				}

				$this->response()->success($this->env->filesystem()->search($item, $data['text']));
				return;

			default:
				throw $this->invalidRequestException();
		}
		$this->response()->success(TRUE);
	}

	private function processFind() {
		$data = $this->request->data;
		if (!isset($data) || !isset($data["folder"])) {
			throw $this->invalidRequestException();
		}

		$folderData = $data["folder"];
		if (!isset($folderData["path"])) {
			throw $this->invalidRequestException();
		}

		$parts = explode("/", $folderData["path"]);

		$i = 0;
		$current = NULL;
		foreach ($parts as $part) {
			$candidates = NULL;
			if ($i == 0) {
				$candidates = $this->env->filesystem()->getRootFolders();
			} else {
				$candidates = $current->items();
			}

			$current = NULL;

			foreach ($candidates as $c) {
				if (strcmp($part, $c->name()) === 0) {
					$current = $c;
					break;
				}
			}

			if ($current == NULL) {
				throw new ServiceException("DIR_DOES_NOT_EXIST");
			}

			$i++;
		}
		$result = $this->getFolderInfo($current, TRUE, $data["data"]);
		$this->response()->success($result);
	}

	public function __toString() {
		return "FileSystemServices";
	}
}
?>
