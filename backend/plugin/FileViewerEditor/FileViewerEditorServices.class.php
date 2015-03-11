<?php

/**
 * FileViewerEditorServices.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class FileViewerEditorServices extends ServicesBase {
	protected function isValidPath($method, $path) {
		return count($path) > 1;
	}

	public function processGet() {
		$id = $this->path[0];
		if (strpos($id, "_") === FALSE) {
			$item = $this->item($id);
		} else {
			$parts = explode("_", $id);
			$item = $this->env->plugins()->getPlugin("FileViewerEditor")->getController()->getCustomItemInfo($parts[0], $parts[1]);
		}

		if ($this->id === 'preview') {
			if ($this->path[1] === 'info') {
				$this->response()->success($this->env->plugins()->getPlugin("FileViewerEditor")->getController()->getPreview($item));
				return;
			}
			if ($this->path[1] === 'content') {
				$this->env->filesystem()->view($item);
				return;
			}
		} else if ($this->id === 'view') {
			if ($this->path[1] === 'data') {
				$this->env->plugins()->getPlugin("FileViewerEditor")->getController()->processDataRequest($item, array_slice($this->path, 2));
				return;
			}
			if ($this->path[1] === 'content') {
				if (is_array($item)) {
					$this->env->plugins()->getPlugin("FileViewerEditor")->getController()->handleCustomItemContent($item);
				} else {
					$this->env->filesystem()->view($item);
				}

				return;
			}
		} else if ($this->id === 'edit') {
			$this->env->plugins()->getPlugin("FileViewerEditor")->getController()->processEditRequest($item, array_slice($this->path, 1));
			return;
		}
		throw $this->invalidRequestException();
	}

	public function __toString() {
		return "FileViewerServices";
	}
}
?>