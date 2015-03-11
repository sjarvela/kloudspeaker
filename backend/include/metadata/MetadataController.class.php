<?php
/**
 * MetadataController.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

require_once "MetadataDao.class.php";

class Mollify_MetadataController {
	private $env;
	private $dao;
	private $_cache = array();

	public function __construct($env) {
		$this->env = $env;
		$this->dao = new Mollify_MetadataDao($this->env);
	}

	public function initialize() {
		$this->env->filesystem()->registerItemCleanupHandler($this);
		$this->env->filesystem()->registerDataRequestPlugin(array("item-metadata", "parent-metadata"), $this);
	}

	public function onEvent($e) {
		if (strcmp(FilesystemController::EVENT_TYPE_FILE, $e->type()) != 0) {
			return;
		}

		$type = $e->subType();

		if ($type === FileEvent::DELETE) {
			foreach ($e->items() as $item) {
				$this->dao->deleteMetadata($item);
			}
		}
	}

	public function cleanupItemIds($ids) {
		$this->dao->cleanupItemIds($ids);
	}

	public function getRequestData($parent, $items, $key, $requestData) {
		$result = array();
		if (strcmp("item-metadata", $key) === 0) {
			if ($parent != NULL) {
				$result = array_merge($result, $this->dao->getItemMetadataForChildren($parent));
			} else {
				foreach ($items as $i) {
					$result[$i->id()] = $this->get($i);
				}
			}
		} else if (strcmp("parent-metadata", $key) === 0) {
			if ($parent != NULL) {
				$result = $this->get($parent);
			}
		}

		return $result;
	}

	public function get($item, $key = NULL) {
		$id = $item->id();
		if (!isset($this->_cache[$id])) {
			$md = $this->dao->getItemMetadata($id);
			$this->_cache[$id] = $md;
		} else {
			$md = $this->_cache[$id];
		}
		if ($key != NULL) {
			return isset($md[$key]) ? $md[$key] : NULL;
		}

		return $md;
	}

	public function set($item, $key, $value) {
		$id = $item->id();
		$this->dao->setItemMetadata($id, $key, $value);

		if (isset($this->_cache[$id])) {
			$this->_cache[$id][$key] = $value;
		}
	}

	public function remove($item, $key = NULL) {
		$this->dao->removeItemMetadata($item, $key);

		$id = $item->id();
		if (isset($this->_cache[$id])) {
			if ($key != NULL) {
				unset($this->_cache[$id][$key]);
			} else {
				unset($this->_cache[$id]);
			}
		}
	}

	public function find($parent, $key, $value = FALSE, $recursive = FALSE) {
		return $this->dao->find($parent, $key, $value, $recursive);
	}

	public function __toString() {
		return "MetadataController";
	}
}
?>