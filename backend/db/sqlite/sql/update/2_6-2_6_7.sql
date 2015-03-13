UPDATE parameter SET value = '2_6_7' WHERE name = 'version';

UPDATE item_id SET path = REPLACE(path, '\\', '/');