<?php

	/**
	 * DebugServices.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class PermissionServices extends ServicesBase {
		protected function isValidPath($method, $path) {
			return count($path) > 0;
		}
		
		protected function isAuthenticationRequired() {
			return TRUE;
		}
		
		protected function isAdminRequired() {
			return TRUE;
		}

		public function processGet() {
			if ($this->path[0] === 'types') {
				$result = array("types" => $this->env->permissions()->getTypes());
				
				$users = ($this->env->request()->hasParam("u") and strcmp($this->env->request()->param("u"), "1") == 0);
				if ($users) $result["users"] = $this->env->configuration()->getAllUsers(TRUE, TRUE);
				
				$this->response()->success($result);
				return;
			} else if ($this->path[0] === 'list') {
				$data = $this->request->data;
				$name = $this->env->request()->hasParam("name") ? $this->env->request()->param("name") : NULL;
				$subject = $this->env->request()->hasParam("subject") ? $this->env->request()->param("subject") : NULL;
				$userId = $this->env->request()->hasParam("user_id") ? $this->env->request()->param("user_id") : NULL;
				
				if (count($this->path) == 2 and $this->path[1] == "generic")
					$permissions = $this->env->permissions()->getGenericPermissions(NULL, $userId);
				else
					$permissions = $this->env->permissions()->getPermissions($name, $subject, $userId);
				$result = array("permissions" => $permissions);
				
				$users = ($this->env->request()->hasParam("u") and strcmp($this->env->request()->param("u"), "1") == 0);
				if ($users) $result["users"] = $this->env->configuration()->getAllUsers(TRUE);
				
				$this->response()->success($result);
				return;
			} else if ($this->path[0] === 'user' and count($this->path) >= 2) {
				$userId = $this->path[1];
				$subject = $this->env->request()->hasParam("subject") ? $this->env->request()->param("subject") : NULL;
				
				if (count($this->path) == 3 and $this->path[2] == "generic")
					$permissions = $this->env->permissions()->getGenericPermissions(NULL, $userId);
				else {
					$effective = ($this->env->request()->hasParam("e") and strcmp($this->env->request()->param("e"), "1") == 0);
					$name = $this->env->request()->hasParam("name") ? $this->env->request()->param("name") : NULL;
					
					if ($subject != NULL and $effective and $name != NULL) {
						$item = $this->env->filesystem()->item($subject);
						$this->response()->success($this->env->permissions()->getEffectiveFilesystemPermissions($name, $item, $userId));
						return;
					} else
						$permissions = $this->env->permissions()->getPermissions(NULL, $subject, $userId);
				}
				$result = array("permissions" => $permissions);
				
				$types = ($this->env->request()->hasParam("t") and strcmp($this->env->request()->param("t"), "1") == 0);
				if ($types) $result["types"] = $this->env->permissions()->getTypes();

				$this->response()->success($result);
				return;
			}
			throw $this->invalidRequestException();
		}
		
		public function processPut() {
			if ($this->path[0] === 'list') {
				$this->response()->success($this->env->permissions()->updatePermissions($this->request->data));
				return;
			}
			throw $this->invalidRequestException();
		}

		public function processDelete() {
			if ($this->path[0] === 'list') {
				if (!isset($this->request->data["list"]) or !is_array($this->request->data["list"])) throw $this->invalidRequestException();
				$this->response()->success($this->env->permissions()->updatePermissions(array(
					"removed" => $this->request->data["list"])
				));
				return;
			}
			throw $this->invalidRequestException();
		}
		
		public function processPost() {
			if ($this->path[0] === 'query') {
				$this->response()->success($this->env->permissions()->processQuery($this->request->data));
				return;
			}
			throw $this->invalidRequestException();
		}
		
		public function __toString() {
			return "PermissionServices";
		}
	}
?>
