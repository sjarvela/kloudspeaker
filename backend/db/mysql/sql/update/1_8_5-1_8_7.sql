UPDATE `{TABLE_PREFIX}parameter` SET value = '1_8_7' WHERE name = 'version';

CREATE TABLE `{TABLE_PREFIX}session` (
  `id` char(32) NOT NULL,
  `user_id` int(11) NOT NULL,
  `time` bigint(11) NOT NULL,
  `last_access` bigint(11) NOT NULL,
  `ip` varchar(128) NULL,
  PRIMARY KEY (`id`)
) COLLATE utf8_general_ci COMMENT = 'Mollify sessions';

CREATE TABLE `{TABLE_PREFIX}session_data` (
  `session_id` char(32) NOT NULL,
  `name` char(64) NOT NULL,
  `value` varchar(128) NULL,
  PRIMARY KEY (`session_id`, `name`)
) COLLATE utf8_general_ci COMMENT = 'Mollify session data';