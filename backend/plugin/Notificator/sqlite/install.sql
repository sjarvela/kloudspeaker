CREATE TABLE notificator_notification (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  message_title varchar(255) NOT NULL DEFAULT '',
  message varchar(512) NOT NULL DEFAULT ''
);
CREATE TABLE notificator_notification_event (
  id INTEGER PRIMARY KEY,
  notification_id int(11) NOT NULL,
  event_type varchar(128) NOT NULL,
  FOREIGN KEY(notification_id) REFERENCES notificator_notification(id)
);
CREATE TABLE notificator_notification_event_filter (
  id INTEGER PRIMARY KEY,
  notification_event_id int(11) NOT NULL,
  type varchar(128) NOT NULL,
  value varchar(128) NOT NULL,
  FOREIGN KEY(notification_event_id) REFERENCES notificator_notification_event(id)
);
CREATE TABLE notificator_notification_user (
  notification_id int(11) NOT NULL,
  user_id int(11) NOT NULL,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY(notification_id) REFERENCES notificator_notification(id),
  FOREIGN KEY(user_id) REFERENCES user(id)
);
CREATE TABLE notificator_notification_item (
  notification_id int(11) NOT NULL,
  item_id varchar(128) NOT NULL,
  PRIMARY KEY (notification_id, item_id),
  FOREIGN KEY(notification_id) REFERENCES notificator_notification(id)
);
CREATE TABLE notificator_notification_recipient (
  notification_id int(11) NOT NULL,
  user_id int(11) NOT NULL,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY(notification_id) REFERENCES notificator_notification(id),
  FOREIGN KEY(user_id) REFERENCES user(id)
);
INSERT INTO parameter (name, value) VALUES ('plugin_Notificator_version', '1_1');