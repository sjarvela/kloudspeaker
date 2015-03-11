UPDATE `{TABLE_PREFIX}parameter` SET value = '2_5_1' WHERE name = 'version';

ALTER TABLE `{TABLE_PREFIX}user_auth` ADD `hint` char(128) NULL;