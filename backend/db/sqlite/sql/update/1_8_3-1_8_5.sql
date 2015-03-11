UPDATE parameter SET value = '1_8_5' WHERE name = 'version';

CREATE TABLE item_id (
  path char(255) NOT NULL,
  id char(13) NOT NULL,
  PRIMARY KEY (id)
);