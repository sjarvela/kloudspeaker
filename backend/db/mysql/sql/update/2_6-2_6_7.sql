UPDATE `{TABLE_PREFIX}parameter` SET value = '2_6_7' WHERE name = 'version';

UPDATE `{TABLE_PREFIX}item_id` SET path = REPLACE(path, '\\', '/');