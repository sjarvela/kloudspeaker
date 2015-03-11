UPDATE `{TABLE_PREFIX}parameter` SET value = '1_2' WHERE name = 'plugin_Registration_version';

ALTER TABLE `{TABLE_PREFIX}registration` ADD `password_hint` char(128) NULL;