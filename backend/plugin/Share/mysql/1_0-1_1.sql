UPDATE `{TABLE_PREFIX}parameter` SET value = '1_1' WHERE name = 'plugin_Share_version';

ALTER TABLE `{TABLE_PREFIX}share` ADD `expiration` bigint(11) NULL AFTER `user_id`;
