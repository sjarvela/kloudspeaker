<?php
/**
 * PermissionsController.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once "PermissionsDao.class.php";

class Kloudspeaker_PermissionsController {
	private $env;
	private $dao;
	private $genericPermissions = array();
	private $filesystemPermissions = array();

	private $filesystemPermissionPrefetchedParents = array();
	private $permissionCaches = array();

	public function __construct($env) {
		$this->env = $env;
		$this->dao = new Kloudspeaker_PermissionsDao($this->env);
	}

	public function initialize() {
		$this->env->filesystem()->registerItemCleanupHandler($this);
	}

	public function registerFilesystemPermission($name, $values = NULL) {
		$this->filesystemPermissions[$name] = $values;
	}

	public function registerPermission($name, $values = NULL) {
		$this->genericPermissions[$name] = $values;
	}

	public function getTypes() {
		return array("generic" => $this->genericPermissions, "filesystem" => $this->filesystemPermissions);
	}

	private function getFromCache($name, $subject) {
		if (array_key_exists($name, $this->permissionCaches) and array_key_exists($subject, $this->permissionCaches[$name])) {
			$permission = $this->permissionCaches[$name][$subject];
			Logging::logDebug("Permission cache get [" . $name . "/" . $subject . "]=" . $permission);
			return $permission;
		}
		return FALSE;

	}

	private function putToCache($name, $subject, $value) {
		if (!array_key_exists($name, $this->permissionCaches)) {
			$this->permissionCaches[$name] = array();
		}

		$this->permissionCaches[$name][$subject] = $value;
		Logging::logDebug("Permission cache put [" . $name . "/" . $subject . "]=" . $value);
	}

	public function getAllPermissions() {
		return $this->getPermission(NULL);
	}

	public function getPermission($name) {
		if ($name != NULL and !array_key_exists($name, $this->genericPermissions)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission key: " . $name);
		}

		$nameKeys = ($name != NULL ? array($name) : array_keys($this->genericPermissions));

		$result = array();
		$queryResult = NULL;

		foreach ($nameKeys as $nk) {
			if ($this->env->authentication()->isAdmin()) {
				$values = $this->genericPermissions[$nk];

				if ($values != NULL) {
					$result[$nk] = $values[count($values) - 1];
				} else {
					$result[$nk] = "1";
				}

				continue;
			}

			$permission = $this->getFromCache($nk, "");
			if ($permission !== FALSE) {
				$result[$nk] = $permission;
				continue;
			}

			if ($queryResult == NULL) {
				$queryResult = $this->dao->getEffectiveGenericPermissions(($name != NULL ? $name : $nameKeys), $this->env->session()->userId(), $this->getGroupIds());
			}

			$permission = array_key_exists($nk, $queryResult) ? $queryResult[$nk] : NULL;

			if ($permission == NULL) {
				$values = $this->genericPermissions[$nk];
				if ($values != NULL) {
					$permission = $values[0];
				}
				//fallback to first
			}
			$this->putToCache($nk, "", $permission);

			$result[$nk] = $permission;
		}

		if ($name != NULL) {
			return $result[$nk];
		}

		return $result;
	}

	public function getAllFilesystemPermissions($item) {
		return $this->getFilesystemPermission(NULL, $item);
	}

	public function getFilesystemPermission($name, $item) {
		if ($item == NULL) {
			throw new ServiceException("INVALID_CONFIGURATION");
		}

		if ($name != NULL and !array_key_exists($name, $this->filesystemPermissions)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission key: " . $name);
		}

		$nameKeys = ($name != NULL ? array($name) : array_keys($this->filesystemPermissions));

		$id = $item->id();
		$result = array();
		$queryResult = NULL;

		foreach ($nameKeys as $nk) {
			if ($this->env->authentication()->isAdmin()) {
				$values = $this->filesystemPermissions[$nk];

				if ($values != NULL) {
					$result[$nk] = $values[count($values) - 1];
				} else {
					$result[$nk] = "1";
				}

				continue;
			}

			if (method_exists($item->filesystem(), "getOverriddenItemPermission")) {
				$permission = $item->filesystem()->getOverriddenItemPermission($item, $nk);
				if ($permission !== FALSE) {
					$result[$nk] = $permission;
					continue;
				}
			}

			$permission = $this->getFromCache($nk, $id);
			if ($permission !== FALSE) {
				$result[$nk] = $permission;
				continue;
			}

			// if parent folder has been prefetched, we know item does not have specific permissions -> try parent permission
			$parent = $item->parent();
			if ($parent != NULL) {
				$parentId = $item->parent()->id();
				if (array_key_exists($nk, $this->filesystemPermissionPrefetchedParents) and in_array($parentId, $this->filesystemPermissionPrefetchedParents[$nk])) {
					$permission = $this->getFromCache($nk, $parentId);
					if ($permission !== FALSE) {
						$result[$nk] = $permission;
						continue;
					}
				}
			}

			if ($queryResult == NULL) {
				$queryResult = $this->dao->getFilesystemPermission(($name != NULL ? $name : $nameKeys), $item, $this->env->session()->userId(), $this->getGroupIds());
			}

			//Logging::logDebug("PERMISSION query: ".Util::array2str($queryResult));

			$permission = array_key_exists($nk, $queryResult) ? $queryResult[$nk] : NULL;
			//Logging::logDebug("PERMISSION query: ".$permission);

			if ($permission == NULL) {
				$values = $this->filesystemPermissions[$nk];
				if ($values != NULL) {
					$permission = $values[0];
				}
				//fallback to first
			}
			$this->putToCache($nk, $id, $permission);

			$result[$nk] = $permission;
		}

		if ($name != NULL) {
			return $result[$nk];
		}

		return $result;
	}

	private function getGroupIds() {
		$groupIds = array();
		if ($this->env->session()->hasUserGroups()) {
			foreach ($this->env->session()->userGroups() as $g) {
				$groupIds[] = $g['id'];
			}
		}

		return $groupIds;
	}

	public function hasFilesystemPermission($name, $item, $required = NULL) {
		if (!array_key_exists($name, $this->filesystemPermissions)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission key: " . $name);
		}

		$values = $this->filesystemPermissions[$name];
		if ($required != NULL and $values != NULL) {
			$requiredIndex = array_search($required, $values);
			if ($requiredIndex === FALSE) {
				throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission value: " . $required);
			}
		}

		if ($this->env->authentication()->isAdmin()) {
			return TRUE;
		}

		$userValue = $this->getFilesystemPermission($name, $item);
		if (!$userValue) {
			return FALSE;
		}

		// on/off permission is found
		if ($values == NULL) {
			return ($userValue == "1");
		}

		$userValueIndex = array_search($userValue, $values);
		if ($userValueIndex === FALSE) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission value: " . $userValue);
		}

		// check permission level by index
		return $userValueIndex >= $requiredIndex;
	}

	public function hasPermission($name, $required = NULL) {
		if (!array_key_exists($name, $this->genericPermissions)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission key: " . $name);
		}

		$values = $this->genericPermissions[$name];
		if ($required != NULL and $values != NULL) {
			$requiredIndex = array_search($required, $values);
			if ($requiredIndex === FALSE) {
				throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission value: " . $required);
			}
		}

		if ($this->env->authentication()->isAdmin()) {
			return TRUE;
		}

		$userValue = $this->getPermission($name);
		if (!$userValue) {
			return FALSE;
		}

		// on/off permission is found
		if ($values == NULL) {
			return ($userValue == "1");
		}

		$userValueIndex = array_search($userValue, $values);
		if ($userValueIndex === FALSE) {
			throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission value: " . $userValue);
		}

		// check permission level by index
		return $userValueIndex >= $requiredIndex;
	}

	public function prefetchFilesystemChildrenPermissions($name, $parent) {
		if ($this->env->authentication()->isAdmin()) {
			return;
		}

		$permissions = FALSE;
		if (method_exists($parent->filesystem(), "getOverriddenChildrenPermissions")) {
			$permissions = $parent->filesystem()->getOverriddenChildrenPermissions($name, $parent);
			if ($permissions == NULL) return;	//skip prefetch
		}

		if ($permissions === FALSE)
			$permissions = $this->dao->getFilesystemPermissionsForChildren($name, $parent, $this->env->session()->userId(), $this->getGroupIds());
		//Logging::logDebug("PERMISSIONS QUERY ".Util::array2str($permissions));

		if (!array_key_exists($name, $this->filesystemPermissionPrefetchedParents)) {
			$this->filesystemPermissionPrefetchedParents[$name] = array();
		}

		$this->filesystemPermissionPrefetchedParents[$name][] = $parent->id();

		//if (!array_key_exists($name, $this->permissionCaches)) $this->permissionCaches[$name] = array();
		foreach ($permissions as $id => $p) {
			$this->putToCache($name, $id, $p);
		}
	}

	public function temporaryFilesystemPermission($name, $item, $permission) {
		$this->putToCache($name, is_array($item) ? $item["id"] : (is_string($item) ? $item : $item->id()), $permission);
	}

	public function getPermissions($name = NULL, $subject = NULL, $userId = NULL) {

		if ($name != NULL) {
			if (!array_key_exists($name, $this->genericPermissions) and !array_key_exists($name, $this->filesystemPermissions)) {
				throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission key: " . $name);
			}
		}

		if ($userId == $this->env->session()->userId() and $this->env->authentication()->isAdmin()) {
			return array();
		}

		return $this->dao->getPermissions($name, $subject, $userId);
	}

	public function getGenericPermissions($name = NULL, $userId = NULL) {
		if ($name != NULL) {
			if (!array_key_exists($name, $this->genericPermissions) and !array_key_exists($name, $this->filesystemPermissions)) {
				throw new ServiceException("INVALID_CONFIGURATION", "Invalid permission key: " . $name);
			}
		}

		if ($userId == $this->env->session()->userId() and $this->env->authentication()->isAdmin()) {
			return array();
		}

		return $this->dao->getGenericPermissions($name, $userId);
	}

	public function getEffectiveFilesystemPermissions($name, $item, $userId) {
		$groupIds = array();
		foreach ($this->env->configuration()->getUsersGroups($userId) as $g) {
			$groupIds[] = $g['id'];
		}

		$result = $this->dao->getEffectiveFilesystemPermissions($name, $item, $userId, $groupIds);
		return $this->getRelatedFilesystemItemsAndFilterInvalid($result);
	}

	public function updatePermissions($permissionData) {
		//TODO validate
		return $this->dao->updatePermissions($permissionData);
	}

	public function addGenericPermission($name, $userId, $value = "1") {
		$this->dao->addPermission($name, "", $userId, $value);
	}

	public function addFilesystemPermission($item, $name, $userId, $value = "1") {
		$this->dao->addPermission($name, $item != NULL ? $item->id() : "", $userId, $value);
	}

	public function removeFilesystemPermissions($item, $name = NULL) {
		$this->dao->removeFilesystemPermissions($name, $item);
	}

	public function processQuery($data) {
		$result = $this->dao->processQuery($data);
		$filtered = $this->getRelatedFilesystemItemsAndFilterInvalid($result["data"]);
		$result["data"] = $filtered["permissions"];
		$result["items"] = $filtered["items"];
		return $result;
	}

	private function getRelatedFilesystemItemsAndFilterInvalid($list) {
		$items = array();
		$invalid = array();
		$result = array();
		foreach ($list as $row) {
			$valid = TRUE;
			$name = $row["name"];

			if (array_key_exists($name, $this->filesystemPermissions)) {
				$subjectId = $row["subject"];

				if (strlen($subjectId) > 0 and !array_key_exists($subjectId, $items)) {
					try {
						$item = $this->env->filesystem()->item($subjectId);
						if ($item->exists()) {
							$items[$subjectId] = $item->data();
						} else {
							$invalid[] = $subjectId;
							$valid = FALSE;
						}
					} catch (ServiceException $e) {
						$invalid[] = $subjectId;
						$valid = FALSE;
					}
				}
			}
			if ($valid) {
				$result[] = $row;
			}
		}

		if (count($invalid) > 0) {
			$this->env->filesystem()->cleanupItemIds($invalid);
		}

		return array("permissions" => $result, "items" => $items);
	}

	public function cleanupItemIds($ids) {
		$this->dao->cleanupItemIds($ids);
	}

	public function getSessionInfo() {
		$result = array();
		$result["permissions"] = $this->getAllPermissions();

		$types = $this->getTypes();
		$t = array(
			"keys" => array(
				"generic" => array_keys($types["generic"]),
				"filesystem" => array_keys($types["filesystem"]),
			),
			"values" => array_merge($types["generic"], $types["filesystem"]),
		);
		$t["keys"]["all"] = array_merge($t["keys"]["generic"], $t["keys"]["filesystem"]);

		$result["permission_types"] = $t;

		return $result;
	}
}
?>