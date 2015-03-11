UPDATE `{TABLE_PREFIX}parameter` SET value = '1_8_8' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user` ADD `expiration` bigint(11) NULL AFTER `is_group`;