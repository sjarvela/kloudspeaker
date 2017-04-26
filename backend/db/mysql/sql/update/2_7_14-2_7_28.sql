ALTER TABLE `{TABLE_PREFIX}item_id` MODIFY COLUMN `id` char(32) NOT NULL UNIQUE;

UPDATE `{TABLE_PREFIX}parameter` SET `value` = '2_7_28' where `name` = 'version';