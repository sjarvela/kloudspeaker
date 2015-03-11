UPDATE `{TABLE_PREFIX}parameter` SET value = '2_5' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}folder` ADD `type` char(32) default 'local' NOT NULL AFTER `path`;