UPDATE `{TABLE_PREFIX}parameter` SET value = '2_2' WHERE name = 'version';
INSERT INTO `{TABLE_PREFIX}parameter` (name, value) VALUES ('old_user_pw', '1');

ALTER TABLE `{TABLE_PREFIX}user` ADD `lang` char(2) NULL AFTER `name`;

CREATE TABLE `{TABLE_PREFIX}user_auth` (
  `user_id` int(11) NOT NULL,
  `type` varchar(8) NULL,
  `salt` char(128) NOT NULL,
  `hash` char(128) NOT NULL,
  `a1hash` char(128) NULL,
  PRIMARY KEY (`user_id`),
  KEY `fk_ua_user` (`user_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Mollify user auth';

INSERT INTO `{TABLE_PREFIX}user_auth` (user_id, type, salt, hash) SELECT id as user_id, auth as type, '-' as salt, '-' as hash FROM `{TABLE_PREFIX}user`;