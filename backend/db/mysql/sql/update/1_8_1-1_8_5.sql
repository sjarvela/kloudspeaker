UPDATE `{TABLE_PREFIX}parameter` SET value = '1_8_5' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user_folder` ADD `path_prefix` varchar(255) NULL AFTER `name`;

CREATE TABLE `{TABLE_PREFIX}item_id` (
  `id` char(13) NOT NULL UNIQUE,
  `path` char(255) NOT NULL UNIQUE
) COLLATE utf8_general_ci COMMENT = 'Kloudspeaker item ids';