UPDATE `{TABLE_PREFIX}parameter` SET value = '1_6_0' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user` ADD `email` VARCHAR(128) NULL AFTER `permission_mode`;