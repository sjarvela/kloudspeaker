UPDATE `{TABLE_PREFIX}parameter` SET value = '1_7_8' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user` ADD `a1password` VARCHAR(128) NULL AFTER `password`;