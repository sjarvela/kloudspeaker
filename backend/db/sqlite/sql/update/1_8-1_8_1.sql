UPDATE parameter SET value = '1_8_1' WHERE name = 'version';

CREATE TEMPORARY TABLE event_log_backup(id,time,user,type,item,details);
INSERT INTO event_log_backup SELECT id,time,user,type,item,details FROM event_log;
DROP TABLE event_log;

CREATE TABLE event_log (
  id INTEGER PRIMARY KEY,
  time bigint(11) NOT NULL,
  user varchar(128) NULL,
  ip varchar(128) NULL,
  type varchar(128) NOT NULL,
  item varchar(512) NULL,
  details varchar(1024) NULL
);

INSERT INTO event_log SELECT id,time,user, '', type,item,details FROM event_log_backup;
DROP TABLE event_log_backup;