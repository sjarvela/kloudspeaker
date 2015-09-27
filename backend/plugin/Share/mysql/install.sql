CREATE TABLE `{TABLE_PREFIX}share` (
  `id` char(32) NOT NULL,
  `item_id` char(255) NOT NULL,
  `type` char(32) NULL,
  `restriction` char(32) NULL,
  `name` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expiration` bigint(11) NULL,
  `created` bigint(11) NOT NULL,
  `quick` TINYINT(1) NOT NULL,  
  `active` TINYINT(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Shares';

CREATE TABLE `{TABLE_PREFIX}share_auth` (
  `id` char(32) NOT NULL,
  `salt` char(128) NOT NULL,
  `hash` char(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Share auth';

INSERT INTO `{TABLE_PREFIX}parameter` (name, value) VALUES ('plugin_Share_version', '1_5');