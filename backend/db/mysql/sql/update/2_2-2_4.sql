UPDATE `{TABLE_PREFIX}parameter` SET value = '2_4' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user` ADD `user_type` char(2) NULL AFTER `permission_mode`;
UPDATE `{TABLE_PREFIX}user` SET user_type = 'a' WHERE permission_mode = 'A';

CREATE TABLE `{TABLE_PREFIX}permission` (
  `name` char(64) NOT NULL,
  `user_id` int(11) NULL DEFAULT 0,
  `subject` char(255) NOT NULL DEFAULT '',
  `value` char(32) NOT NULL,
  PRIMARY KEY (`name`,`user_id`,`subject`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Mollify permissions';

INSERT INTO `{TABLE_PREFIX}permission` (name, user_id, subject, value) SELECT 'filesystem_item_access' as name, user_id, item_id as subject, permission as value FROM `{TABLE_PREFIX}item_permission`;

INSERT INTO `{TABLE_PREFIX}permission` (name, user_id, subject, value) SELECT 'filesystem_item_access' as name, id as user_id, NULL as subject, permission_mode as value FROM user where permission_mode != 'A';
UPDATE `{TABLE_PREFIX}permission` SET value = 'n' WHERE value = 'NO';
UPDATE `{TABLE_PREFIX}permission` SET value = 'r' WHERE value = 'RO';
UPDATE `{TABLE_PREFIX}permission` SET value = 'rwd' WHERE value = 'RW';
UPDATE `{TABLE_PREFIX}permission` SET value = 'rw' WHERE value = 'WD';
INSERT INTO `{TABLE_PREFIX}permission` (name, user_id, subject, value) values ('filesystem_item_access', 0, '', 'r');

ALTER TABLE `{TABLE_PREFIX}user` DROP `permission_mode`;

DROP TABLE `{TABLE_PREFIX}item_permission`;