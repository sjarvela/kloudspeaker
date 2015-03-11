UPDATE `{TABLE_PREFIX}parameter` SET value = '1_5_4' WHERE name = 'version';

CREATE TABLE `{TABLE_PREFIX}event_log` (
  `id` int(11) NOT NULL auto_increment,
  `time` bigint(11) NOT NULL,
  `user` varchar(128) NULL,
  `type` varchar(128) NOT NULL,
  `item` varchar(512) NULL,
  `details` varchar(1024) NULL,
  PRIMARY KEY (`id`)
) COLLATE utf8_general_ci COMMENT = 'Mollify event log';