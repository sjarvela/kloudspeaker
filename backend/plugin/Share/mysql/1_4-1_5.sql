UPDATE `{TABLE_PREFIX}parameter` SET value = '1_5' WHERE name = 'plugin_Share_version';

ALTER TABLE `{TABLE_PREFIX}share` ADD `quick` TINYINT(1) NOT NULL AFTER `created`;
