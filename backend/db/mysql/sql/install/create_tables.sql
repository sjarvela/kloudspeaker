CREATE TABLE `{TABLE_PREFIX}user` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) NOT NULL,
  `lang` char(2) NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `user_type` char(2) NULL,
  `email` varchar(128) NULL,
  `auth` varchar(8) NULL,
  `is_group` TINYINT(1) NOT NULL,
  `expiration` bigint(11) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker users and groups';

CREATE TABLE `{TABLE_PREFIX}user_auth` (
  `user_id` int(11) NOT NULL,
  `type` varchar(8) NULL,
  `salt` char(128) NOT NULL,
  `hash` char(128) NOT NULL,
  `a1hash` char(128) NULL,
  `hint` char(128) NULL,
  PRIMARY KEY (`user_id`),
  KEY `fk_ua_user` (`user_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker user auth';

CREATE TABLE `{TABLE_PREFIX}user_group` (
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`, `group_id`),
  KEY `fk_ug_user` (`user_id`),
  KEY `fk_ug_group` (`group_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker user groups';

CREATE TABLE `{TABLE_PREFIX}folder` (
  `id` int(11) NOT NULL auto_increment,
  `type` char(32) NOT NULL,
  `name` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker published folders';

CREATE TABLE `{TABLE_PREFIX}item_id` (
  `id` char(13) NOT NULL UNIQUE,
  `path` char(255) NOT NULL UNIQUE
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker item ids';

CREATE TABLE `{TABLE_PREFIX}permission` (
  `name` char(64) NOT NULL,
  `user_id` int(11) NULL DEFAULT 0,
  `subject` char(255) NOT NULL DEFAULT '',
  `value` char(32) NOT NULL,
  PRIMARY KEY (`name`,`user_id`,`subject`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker permissions';

CREATE TABLE `{TABLE_PREFIX}user_folder` (
  `user_id` int(11) NOT NULL,
  `folder_id` int(11) NOT NULL,
  `name` varchar(255) NULL,
  PRIMARY KEY (`user_id`,`folder_id`),
  KEY `fk_uf_folder` (`folder_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker user published folders';

CREATE TABLE `{TABLE_PREFIX}parameter` (
  `name` char(255) NOT NULL,
  `value` char(255) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker parameters';

CREATE TABLE `{TABLE_PREFIX}event_log` (
  `id` int(11) NOT NULL auto_increment,
  `time` bigint(11) NOT NULL,
  `user` varchar(128) NULL,
  `ip` varchar(128) NULL,
  `type` varchar(128) NOT NULL,
  `item` varchar(512) NULL,
  `details` varchar(1024) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker event log';

CREATE TABLE `{TABLE_PREFIX}session` (
  `id` char(32) NOT NULL,
  `user_id` int(11) NOT NULL,
  `time` bigint(11) NOT NULL,
  `last_access` bigint(11) NOT NULL,
  `ip` varchar(128) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker sessions';

CREATE TABLE `{TABLE_PREFIX}session_data` (
  `session_id` char(32) NOT NULL,
  `name` char(64) NOT NULL,
  `value` varchar(128) NULL,
  PRIMARY KEY (`session_id`, `name`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker session data';

CREATE TABLE `{TABLE_PREFIX}metadata` (
  `item_id` char(32) NOT NULL,
  `md_key` char(128) NOT NULL,
  `md_value` varchar(512) NULL,
  PRIMARY KEY (`item_id`, `md_key`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'kloudspeaker metadata';