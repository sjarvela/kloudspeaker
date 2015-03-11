UPDATE `{TABLE_PREFIX}parameter` SET value = '1_7_10' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user` ADD `auth` VARCHAR(8) NULL AFTER `email`;
UPDATE `{TABLE_PREFIX}user` SET `auth` = 'PW';