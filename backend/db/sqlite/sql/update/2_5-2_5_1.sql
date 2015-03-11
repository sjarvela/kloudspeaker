UPDATE parameter SET value = '2_5_1' WHERE name = 'version';

ALTER TABLE user_auth ADD COLUMN hint char(128) NULL;