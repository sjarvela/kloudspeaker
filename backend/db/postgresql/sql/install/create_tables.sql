CREATE TABLE `{TABLE_PREFIX}user` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NULL,
  `a1password` varchar(128) NULL,
  `permission_mode` char(2) NULL,
  `email` varchar(128) NULL,
  `auth` varchar(8) NULL,
  `is_group` TINYINT(1) NOT NULL,
  `expiration` bigint(11) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker users and groups';

CREATE TABLE `{TABLE_PREFIX}user_group` (
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`, `group_id`),
  KEY `fk_ug_user` (`user_id`),
  KEY `fk_ug_group` (`group_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker user groups';

CREATE TABLE `{TABLE_PREFIX}folder` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker published folders';

CREATE TABLE `{TABLE_PREFIX}item_id` (
  `id` char(13) NOT NULL UNIQUE,
  `path` char(255) NOT NULL UNIQUE
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker item ids';

CREATE TABLE `{TABLE_PREFIX}item_description` (
  `item_id` char(255) NOT NULL,
  `description` varchar(512) NOT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker item descriptions';

CREATE TABLE `{TABLE_PREFIX}item_permission` (
  `user_id` int(11) NULL DEFAULT 0,
  `item_id` char(255) NOT NULL,
  `permission` char(2) NOT NULL,
  PRIMARY KEY (`user_id`,`item_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker item permissions';

CREATE TABLE `{TABLE_PREFIX}user_folder` (
  `user_id` int(11) NOT NULL,
  `folder_id` int(11) NOT NULL,
  `name` varchar(255) NULL,
  PRIMARY KEY (`user_id`,`folder_id`),
  KEY `fk_uf_folder` (`folder_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker user published folders';

CREATE TABLE `{TABLE_PREFIX}parameter` (
  `name` char(255) NOT NULL,
  `value` char(255) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker parameters';

CREATE TABLE `{TABLE_PREFIX}event_log` (
  `id` int(11) NOT NULL auto_increment,
  `time` bigint(11) NOT NULL,
  `user` varchar(128) NULL,
  `ip` varchar(128) NULL,
  `type` varchar(128) NOT NULL,
  `item` varchar(512) NULL,
  `details` varchar(1024) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker event log';

CREATE TABLE `{TABLE_PREFIX}session` (
  `id` char(32) NOT NULL,
  `user_id` int(11) NOT NULL,
  `time` bigint(11) NOT NULL,
  `last_access` bigint(11) NOT NULL,
  `ip` varchar(128) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker sessions';

CREATE TABLE `{TABLE_PREFIX}session_data` (
  `session_id` char(32) NOT NULL,
  `name` char(64) NOT NULL,
  `value` varchar(128) NULL,
  PRIMARY KEY (`session_id`, `name`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Kloudspeaker session data';