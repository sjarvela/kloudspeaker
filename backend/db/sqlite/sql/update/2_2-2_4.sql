UPDATE parameter SET value = '2_4' WHERE name = 'version';

ALTER TABLE user ADD COLUMN user_type char(2) NULL;
UPDATE user SET user_type = 'a' WHERE permission_mode = 'A';

CREATE TABLE permission (
  name char(64) NOT NULL,
  user_id int(11) NULL DEFAULT 0,
  subject char(255) NOT NULL DEFAULT '',
  value char(32) NOT NULL,
  PRIMARY KEY (name,user_id,subject)
);

INSERT INTO permission (name, user_id, subject, value) SELECT 'filesystem_item_access' as name, user_id, item_id as subject, permission as value FROM item_permission;

INSERT INTO permission (name, user_id, subject, value) SELECT 'filesystem_item_access' as name, id as user_id, NULL as subject, permission_mode as value FROM user where permission_mode != 'A';
UPDATE permission SET value = 'n' WHERE value = 'NO';
UPDATE permission SET value = 'r' WHERE value = 'RO';
UPDATE permission SET value = 'rwd' WHERE value = 'RW';
UPDATE permission SET value = 'rw' WHERE value = 'WD';
INSERT INTO permission (name, user_id, subject, value) values ('filesystem_item_access', 0, '', 'r');

ALTER TABLE user DROP COLUMN permission_mode;

DROP TABLE item_permission;