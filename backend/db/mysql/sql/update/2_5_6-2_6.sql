UPDATE `{TABLE_PREFIX}parameter` SET value = '2_6' WHERE name = 'version';

CREATE TABLE `{TABLE_PREFIX}metadata` (
  `item_id` char(32) NOT NULL,
  `md_key` char(128) NOT NULL,
  `md_value` varchar(512) NULL,
  PRIMARY KEY (`item_id`, `md_key`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Mollify metadata';

INSERT INTO `{TABLE_PREFIX}metadata` (item_id, md_key, md_value) (SELECT item_id, 'description' as md_key, description as md_value FROM `{TABLE_PREFIX}item_description`);

DROP TABLE `{TABLE_PREFIX}item_description`;