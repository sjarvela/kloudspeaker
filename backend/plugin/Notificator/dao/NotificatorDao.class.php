<?php

/**
 * NotificatorDao.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class NotificatorDao {
	private $env;

	public function __construct($env) {
		$this->env = $env;
	}

	public function getAllNotifications() {
		$db = $this->env->db();
		$result = $db->query("select id, name from " . $db->table("notificator_notification") . " order by id asc")->rows();
		return $result;
	}

	public function getNotification($id) {
		$db = $this->env->db();

		$query = "select ntf.id as id, ntf.name as name, ntf.message_title as message_title, ntf.message as message, evt.id as event_id, evt.event_type as event_type, evtf.id as event_filter_id, evtf.type as event_filter_type, evtf.value as event_filter_value, ntf_user.id as ntf_usr_id, ntf_user.name as ntf_usr_name, ntf_user.email as ntf_usr_email, ntf_rcp_user.id as ntf_rcp_usr_id, ntf_rcp_user.name as ntf_rcp_usr_name, ntf_rcp_user.email as ntf_rcp_usr_email ";

		$query .= "from " . $db->table("notificator_notification") . " ntf left outer join " . $db->table("notificator_notification_event") . " evt on evt.notification_id = ntf.id left outer join " . $db->table("notificator_notification_event_filter") . " evtf on evt.id = evtf.notification_event_id left outer join " . $db->table("notificator_notification_user") . " ntf_usr on ntf_usr.notification_id = ntf.id left outer join " . $db->table("user") . " ntf_user on ntf_user.id = ntf_usr.user_id left outer join " . $db->table("notificator_notification_recipient") . " ntf_rcp on ntf_rcp.notification_id = ntf.id left outer join " . $db->table("user") . " ntf_rcp_user on ntf_rcp_user.id = ntf_rcp.user_id";

		$query .= " where ntf.id = " . $db->string($id, TRUE);

		$rows = $db->query($query)->rows();
		if (count($rows) == 0) {
			return FALSE;
		}

		$users = array();
		$first = $rows[0];
		$events = array();
		$filters = array();
		$result = array(
			"id" => $first["id"],
			"name" => $first["name"],
			"message" => $first["message"],
			"message_title" => $first["message_title"],
			"events" => array(),
			"users" => array(),
			"recipients" => array()
		);

		foreach ($rows as $row) {
			if ($row["event_id"] != NULL and !in_array($row["event_id"], $events)) {
				$events[] = $row["event_id"];
				$result["events"][] = array("id" => $row["event_id"], "type" => $row["event_type"], "filters" => array());
			}
			if ($row["event_filter_id"] != NULL and !in_array($row["event_filter_id"], $filters)) {
				$filters[] = $row["event_filter_id"];
				$c = count($result["events"]);
				$result["events"][$c - 1]["filters"][] = array("id" => $row["event_filter_id"], "type" => $row["event_filter_type"], "value" => $row["event_filter_value"]);

			}

			$userId = $row["ntf_usr_id"];
			if ($userId != NULL and !in_array($userId, $users)) {
				$users[] = $userId;
				$result["users"][] = array("id" => $userId, "name" => $row["ntf_usr_name"], "email" => $row["ntf_usr_email"]);
			}

			$recipient = $row["ntf_rcp_usr_id"];
			if ($recipient != NULL and !in_array($recipient, $result["recipients"])) {
				$result["recipients"][] = $recipient;
			}
		}

		return $result;
	}

	public function findNotifications($typeId, $userId) {
		$db = $this->env->db();

		$userCriteria = "";
		if ($userId != NULL and $userId != "" and $this->env->session()->isActive()) {
			$userIds = array($userId);
			if ($this->env->session()->hasUserGroups()) {
				foreach ($this->env->session()->userGroups() as $g) {
					$userIds[] = $g['id'];
				}
			}

			$userCriteria = "(ntf_usr.user_id in (" . $db->arrayString($userIds) . ") or (ntf_usr.user_id is null and not exists (select user_id from " . $db->table("notificator_notification_user") . " where notification_id = ntf.id)))";
		} else {
			$userCriteria = "(ntf_usr.user_id is null and not exists (select user_id from " . $db->table("notificator_notification_user") . " where notification_id = ntf.id))";
		}

		$query = "select distinct ntf.id as id, ntf.name as name, ntf.message_title as message_title, ntf.message as message, evt.id as event_id, evt.event_type as event_type, evtf.id as event_filter_id, evtf.type as event_filter_type, evtf.value as event_filter_value, ntf_usr.user_id as ntf_usr_id, ntf_rcp_user.id as ntf_rcp_usr_id, ntf_rcp_user.is_group as ntf_rcp_usr_is_group, ntf_rcp_user.name as ntf_rcp_usr_name, ntf_rcp_user.email as ntf_rcp_usr_email ";

		$query .= "from " . $db->table("notificator_notification") . " ntf left outer join " . $db->table("notificator_notification_event") . " evt on evt.notification_id = ntf.id left outer join " . $db->table("notificator_notification_event_filter") . " evtf on evt.id = evtf.notification_event_id left outer join " . $db->table("notificator_notification_user") . " ntf_usr on ntf_usr.notification_id = ntf.id left outer join " . $db->table("notificator_notification_recipient") . " ntf_rcp on ntf_rcp.notification_id = ntf.id left outer join " . $db->table("user") . " ntf_rcp_user on ntf_rcp_user.id = ntf_rcp.user_id";

		$query .= " where (evt.event_type is null or evt.event_type = '$typeId') and $userCriteria and ntf_rcp_user.id is not null";
		$query .= " order by ntf.id asc";

		$rows = $db->query($query)->rows();

		$result = array();
		$recipients = array();
		$recipientIds = array();
		$events = array();
		$eventIds = array();
		$filters = array();
		$filterIds = array();
		$prev = NULL;

		foreach ($rows as $row) {
			if ($prev == NULL) {
				$prev = $row;
			}

			if (strcmp($prev["id"], $row["id"]) != 0) {
				$result[] = new Notification($prev["id"], $prev["name"], $prev["message_title"], $prev["message"], $recipients, $events);
				$recipients = array();
				$recipientIds = array();
				$events = array();
				$eventIds = array();
				$filterIds = array();
			}
			if (!in_array($row["ntf_rcp_usr_id"], $recipientIds)) {
				if ($row["ntf_rcp_usr_is_group"] == 1) {
					$users = $this->env->configuration()->getGroupUsers($row["ntf_rcp_usr_id"]);
					foreach ($users as $u) {
						if (in_array($u["id"], $recipientIds)) {
							continue;
						}

						$recipients[] = array("id" => $u["id"], "name" => $u["name"], "email" => $u["email"]);
						$recipientIds[] = $u["id"];
					}
				} else {
					$recipients[] = array("id" => $row["ntf_rcp_usr_id"], "name" => $row["ntf_rcp_usr_name"], "email" => $row["ntf_rcp_usr_email"]);
				}
				$recipientIds[] = $row["ntf_rcp_usr_id"];
			}

			if (!in_array($row["event_id"], $eventIds)) {
				$eventIds[] = $row["event_id"];
				$events[] = array("id" => $row["event_id"], "type" => $row["event_type"], "filters" => array());
			}
			if ($row["event_filter_id"] != NULL and !in_array($row["event_filter_id"], $filterIds)) {
				$events[count($events) - 1]["filters"][] = array("id" => $row["event_filter_id"], "type" => $row["event_filter_type"], "value" => $row["event_filter_value"]);
				$filterIds[] = $row["event_filter_id"];
			}

			$prev = $row;
		}
		if (count($recipients) > 0) {
			$result[] = new Notification($prev["id"], $prev["name"], $prev["message_title"], $prev["message"], $recipients, $events);
		}

		return $result;
	}

	public function getEventFilters() {

	}

	public function addNotification($data) {
		$db = $this->env->db();
		$db->update(sprintf("INSERT INTO " . $db->table("notificator_notification") . " (name) VALUES ('%s')", $db->string($data["name"])));
		return $db->lastId();
		return TRUE;
	}

	public function removeNotificationUsers($id, $ids) {
		$db = $this->env->db();
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_user") . " WHERE notification_id = '%s' and user_id in (%s)", $db->string($id), $db->arrayString($ids)));
		return TRUE;
	}

	public function removeNotificationRecipients($id, $ids) {
		$db = $this->env->db();
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_recipient") . " WHERE notification_id = '%s' and user_id in (%s)", $db->string($id), $db->arrayString($ids)));
		return TRUE;
	}

	public function removeNotificationEvents($id, $ids) {
		$db = $this->env->db();
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_event") . " WHERE notification_id = '%s' and id in (%s)", $db->string($id), $db->arrayString($ids, TRUE)));
		return TRUE;
	}

	public function editNotificationName($id, $name) {
		$db = $this->env->db();
		$affected = $db->update(sprintf("UPDATE " . $db->table("notificator_notification") . " SET name = '%s' where id=%s", $db->string($name), $db->string($id)));
		//if ($affected != 1) throw new ServiceException("REQUEST_FAILED", "Invalid update for id=".$id);
		return TRUE;
	}

	public function editNotificationMessage($id, $title, $message) {
		$db = $this->env->db();
		$affected = $db->update(sprintf("UPDATE " . $db->table("notificator_notification") . " SET message_title = '%s', message = '%s' where id=%s", $db->string($title), $db->string($message), $db->string($id)));
		//if ($affected != 1) {
		//	throw new ServiceException("REQUEST_FAILED", "Invalid update for id=" . $id);
		//}

		return TRUE;
	}

	public function addNotificationEvents($id, $events) {
		$db = $this->env->db();

		$db->startTransaction();
		foreach ($events as $event) {
			$db->update(sprintf("INSERT INTO " . $db->table("notificator_notification_event") . " (notification_id, event_type) VALUES ('%s', '%s')", $db->string($id), $db->string($event)));
		}

		$db->commit();

		return TRUE;
	}

	public function updateNotificationEventFilters($id, $eventId, $new, $removed) {
		$db = $this->env->db();

		$db->startTransaction();
		foreach ($new as $event) {
			$db->update(sprintf("INSERT INTO " . $db->table("notificator_notification_event_filter") . " (notification_event_id, type, value) VALUES (%s, %s, %s)", $db->string($eventId, TRUE), $db->string($event["type"], TRUE), $db->string($event["value"], TRUE)));
		}

		foreach ($removed as $event) {
			$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_event_filter") . " WHERE id= %s and notification_event_id = %s", $db->string($event["id"], TRUE), $db->string($eventId, TRUE)));
		}

		$db->commit();

		return TRUE;
	}

	public function editNotificationUsers($id, $users) {
		$db = $this->env->db();

		$db->startTransaction();
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_user") . " WHERE notification_id = '%s'", $db->string($id)));
		foreach ($users as $u) {
			$db->update(sprintf("INSERT INTO " . $db->table("notificator_notification_user") . " (notification_id, user_id) VALUES ('%s', '%s')", $db->string($id), $db->string($u)));
		}

		$db->commit();

		return TRUE;
	}

	public function editNotificationRecipients($id, $recipients) {
		$db = $this->env->db();

		$db->startTransaction();
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_recipient") . " WHERE notification_id = '%s'", $db->string($id)));
		foreach ($recipients as $recipient) {
			$db->update(sprintf("INSERT INTO " . $db->table("notificator_notification_recipient") . " (notification_id, user_id) VALUES ('%s', '%s')", $db->string($id), $db->string($recipient)));
		}

		$db->commit();

		return TRUE;
	}

	public function removeNotification($id) {
		$db = $this->env->db();

		$db->startTransaction();
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_recipient") . " WHERE notification_id = '%s'", $db->string($id)));
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_event") . " WHERE notification_id = '%s'", $db->string($id)));
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification_user") . " WHERE notification_id = '%s'", $db->string($id)));
		$db->update(sprintf("DELETE FROM " . $db->table("notificator_notification") . " where id=%s", $db->string($id)));
		$db->commit();

		return TRUE;
	}

	public function __toString() {
		return "NotificatorDao";
	}
}
?>
