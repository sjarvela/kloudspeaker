UPDATE `{TABLE_PREFIX}parameter` SET value = '1_3' WHERE name = 'plugin_Share_version';

ALTER TABLE `{TABLE_PREFIX}share` ADD `restriction` char(32) NULL AFTER `item_id`;

CREATE TABLE `{TABLE_PREFIX}share_auth` (
  `id` char(32) NOT NULL,
  `salt` char(128) NOT NULL,
  `hash` char(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Share auth';
