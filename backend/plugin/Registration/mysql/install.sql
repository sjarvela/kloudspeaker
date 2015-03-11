CREATE TABLE `{TABLE_PREFIX}registration` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) NOT NULL,
  `password` varchar(128) NOT NULL,
  `password_hint` varchar(128) NULL,
  `email` varchar(128) NOT NULL,
  `key` char(64) NOT NULL,
  `time` bigint(11) NOT NULL,
  `confirmed` bigint(11) NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'User registrations';

INSERT INTO `{TABLE_PREFIX}parameter` (name, value) VALUES ('plugin_Registration_version', '1_2');