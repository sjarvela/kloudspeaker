CREATE TABLE `{TABLE_PREFIX}trashbin` (
  `id` char(255) NOT NULL,
  `item_id` char(255) NOT NULL,
  `folder_id` int(11) NOT NULL,
  `path` char(255) NOT NULL, 
  `user_id` int(11) NOT NULL,
  `created` bigint(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Trash bin';

INSERT INTO `{TABLE_PREFIX}parameter` (name, value) VALUES ('plugin_TrashBin_version', '1_0');