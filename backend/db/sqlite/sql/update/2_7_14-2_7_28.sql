CREATE TEMPORARY TABLE itemid_backup(id, level, path);
INSERT INTO itemid_backup SELECT id, level, path FROM item_id;
DROP TABLE item_id;

CREATE TABLE item_id (
  id char(32) NOT NULL,
  path char(255) NOT NULL,
  level smallint NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX i_item_level ON item_id (level);
CREATE INDEX i_item_path_level ON item_id (path, level);

DROP TABLE itemid_backup;

UPDATE parameter SET value = '2_7_28' where name = 'version';