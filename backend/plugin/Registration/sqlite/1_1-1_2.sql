UPDATE parameter SET value = '1_2' WHERE name = 'plugin_Registration_version';

ALTER TABLE registration ADD password_hint char(128) NULL;