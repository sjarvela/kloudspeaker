UPDATE `{TABLE_PREFIX}parameter` SET value = '1_1' WHERE name = 'plugin_Registration_version';

CREATE TABLE `{TABLE_PREFIX}registration` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) NOT NULL,
  `password` varchar(128) NOT NULL,
  `email` varchar(128) NOT NULL,
  `key` char(64) NOT NULL,
  `time` bigint(11) NOT NULL,
  `confirmed` bigint(11) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'User registrations';

INSERT INTO `{TABLE_PREFIX}registration` SELECT `id`, `name`, `password`, `email`, `key`, `time`, NULL as `confirmed` FROM `{TABLE_PREFIX}pending_registrations`;
DROP TABLE `{TABLE_PREFIX}pending_registrations`;