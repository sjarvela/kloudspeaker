UPDATE parameter SET value = '1_1' WHERE name = 'plugin_Notificator_version';

CREATE TEMPORARY TABLE notificator_notification_event_backup(notification_id, event_type);
INSERT INTO notificator_notification_event_backup SELECT notification_id, event_type FROM notificator_notification_event;
DROP TABLE notificator_notification_event;

CREATE TABLE notificator_notification_event (
  id INTEGER PRIMARY KEY,
  notification_id int(11) NOT NULL,
  event_type varchar(128) NOT NULL,
  FOREIGN KEY(notification_id) REFERENCES notificator_notification(id)
);

INSERT INTO notificator_notification_event(notification_id, event_type) SELECT notification_id, event_type FROM notificator_notification_event_backup;
DROP TABLE notificator_notification_event_backup;

CREATE TABLE notificator_notification_event_filter (
  id INTEGER PRIMARY KEY,
  notification_event_id int(11) NOT NULL,
  type varchar(128) NOT NULL,
  value varchar(128) NOT NULL,
  FOREIGN KEY(notification_event_id) REFERENCES notificator_notification_event(id)
);