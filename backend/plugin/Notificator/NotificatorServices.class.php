<?php

	/**
	 * NotificatorServices.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class NotificatorServices extends ServicesBase {
		private $eventFilterItemTypes = array("item_parent", "item_any_parent");
		protected function isAdminRequired() { return TRUE; }
		
		protected function isValidPath($method, $path) {
			return TRUE;
		}

		public function processGet() {
			if ($this->path[0] != 'list') throw $this->invalidRequestException();
			
			if (count($this->path) == 1) {
				$dao = $this->getDao();
				$this->response()->success($dao->getAllNotifications());
				return;
			}
			if (count($this->path) == 2) {
				$dao = $this->getDao();
				$n = $dao->getNotification($this->path[1]);
				
				// transform stored values (id) into filesystem items
				$itemCache = array();
				foreach($n["events"] as &$e) {
					foreach($e["filters"] as &$f) {
						if (!in_array($f["type"], $this->eventFilterItemTypes)) continue;
						
						if (array_key_exists($f["value"], $itemCache)) {
							if ($itemCache[$f["value"]] === FALSE)
								$f["invalid"] = TRUE;
							else
								$f["value"] = $itemCache[$f["value"]];
						} else {
							try {
								$itm = $this->item($f["value"]);
								if (!$itm->exists()) {
									$f["invalid"] = TRUE;
									$itemCache[$f["value"]] = FALSE;
								} else {
									$data = $itm->data();
									$itemCache[$f["value"]] = $data;
									$f["value"] = $data;
								}
							} catch (ServiceException $e) {
								$f["invalid"] = TRUE;
								$itemCache[$f["value"]] = FALSE;
							}
						}
					}
				}
				$this->response()->success($n);
				return;
			}

			throw $this->invalidRequestException();
		}
		
		public function processPost() {
			if (count($this->path) != 1 or $this->path[0] != 'list') throw $this->invalidRequestException();
			
			$notification = $this->request->data;
			if (!isset($notification["name"])) throw $this->invalidRequestException("No data");
			
			$dao = $this->getDao();
			$this->response()->success($dao->addNotification($notification));
		}

		public function processDelete() {
			if (count($this->path) < 2 or count($this->path) > 3 or $this->path[0] != 'list') throw $this->invalidRequestException("Invalid path");
			
			$id = $this->path[1];
			$dao = $this->getDao();
			if (count($this->path) == 2) {
				$this->response()->success($dao->removeNotification($id));
				return;
			}
			
			$key = $this->path[2];
			$data = $this->request->data;
			if (!isset($data["ids"]) or !is_array($data["ids"])) throw $this->invalidRequestException("no ids");
			$ids = $data["ids"];
			if (count($ids) == 0) throw $this->invalidRequestException("no ids");
			
			if ($key == "users") {
				$this->response()->success($dao->removeNotificationUsers($id, $ids));
				return;
			}
			if ($key == "recipients") {
				$this->response()->success($dao->removeNotificationRecipients($id, $ids));
				return;
			}
			if ($key == "events") {
				$this->response()->success($dao->removeNotificationEvents($id, $ids));
				return;
			}

			throw $this->invalidRequestException();
		}
		
		public function processPut() {
			if (count($this->path) < 2 or $this->path[0] != 'list') throw $this->invalidRequestException();
			
			$id = $this->path[1];
			$data = $this->request->data;
			$dao = $this->getDao();
			
			// list/1/events/1/filters
			if (count($this->path) == 5 and $this->path[2] == "events" and $this->path[4] == "filters") {
				$eventId = $this->path[3];
				$new = isset($data["new"]) ? $data["new"] : array();
				
				// transform filesystem items into stored form (id)
				foreach($new as &$f) {
					if (!in_array($f["type"], $this->eventFilterItemTypes)) continue;					
					$f["value"] = $f["value"]["id"];
				}
				$this->response()->success($dao->updateNotificationEventFilters($id, $eventId, $new, isset($data["removed"]) ? $data["removed"] : array()));
				return;
			}
			
			if (isset($data["name"])) {
				$this->response()->success($dao->editNotificationName($id, $data["name"]));
				return;
			}
			if (isset($data["message"])) {
				$this->response()->success($dao->editNotificationMessage($id, isset($data["message_title"]) ? $data["message_title"] : "", $data["message"]));
				return;
			}
			if (isset($data["events"])) {
				$this->response()->success($dao->addNotificationEvents($id, $data["events"]));
				return;
			}
			if (isset($data["users"])) {
				$this->response()->success($dao->editNotificationUsers($id, $data["users"]));
				return;
			}
			if (isset($data["recipients"])) {
				$this->response()->success($dao->editNotificationRecipients($id, $data["recipients"]));
				return;
			}
						
			throw $this->invalidRequestException();
		}
				
		private function getDao() {
			require_once("dao/NotificatorDao.class.php");
			return new NotificatorDao($this->env);
		}
				
		public function __toString() {
			return "NotificatorServices";
		}
	}
?>