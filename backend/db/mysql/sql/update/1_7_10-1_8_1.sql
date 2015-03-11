UPDATE `{TABLE_PREFIX}parameter` SET value = '1_8_1' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}event_log` ADD `ip` VARCHAR( 128 ) NOT NULL AFTER `user`;