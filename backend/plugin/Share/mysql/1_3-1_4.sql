UPDATE `{TABLE_PREFIX}parameter` SET value = '1_4' WHERE name = 'plugin_Share_version';

ALTER TABLE `{TABLE_PREFIX}share` ADD `type` char(32) NULL AFTER `item_id`;
