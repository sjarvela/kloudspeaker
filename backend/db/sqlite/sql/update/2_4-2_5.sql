UPDATE parameter SET value = '2_5' WHERE name = 'version';

ALTER TABLE folder ADD COLUMN type char(32) NOT NULL default 'local';