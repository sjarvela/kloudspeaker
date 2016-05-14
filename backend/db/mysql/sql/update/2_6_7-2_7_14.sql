ALTER TABLE `{TABLE_PREFIX}item_id` ADD `level` smallint NULL;
UPDATE `{TABLE_PREFIX}item_id` SET `level` = (LENGTH(path) - LENGTH(REPLACE(SUBSTRING(path, 1, LENGTH(path)-1), '/', '')));
ALTER TABLE `{TABLE_PREFIX}item_id` MODIFY COLUMN `level` smallint NOT NULL;
ALTER TABLE `{TABLE_PREFIX}item_id` ADD INDEX(`level`);
ALTER TABLE `{TABLE_PREFIX}item_id` ADD INDEX(`path`, `level`);

UPDATE `{TABLE_PREFIX}parameter` SET `value` = '2_7_14' where `name` = 'version';