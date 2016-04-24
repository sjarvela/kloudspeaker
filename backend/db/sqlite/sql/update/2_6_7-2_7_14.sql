CREATE TEMPORARY TABLE itemid_backup(id, path);
INSERT INTO itemid_backup SELECT id, path FROM item_id;
DROP TABLE item_id;

CREATE TABLE item_id (
  id char(13) NOT NULL,
  path char(255) NOT NULL,
  level smallint NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX i_item_level ON item_id (level);
CREATE INDEX i_item_path_level ON item_id (path, level);

INSERT INTO item_id(id, path, level) SELECT id, path, (LENGTH(path) - LENGTH(REPLACE(SUBSTR(path, 1, LENGTH(path)-1), '/', ''))) as level FROM itemid_backup;
DROP TABLE itemid_backup;

UPDATE parameter SET value = '2_7_14' where name = 'version';