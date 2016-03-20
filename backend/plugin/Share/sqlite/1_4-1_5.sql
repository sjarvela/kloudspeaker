UPDATE parameter SET value = '1_5' WHERE name = 'plugin_Share_version';

CREATE TEMPORARY TABLE share_backup(id,item_id,type,name,user_id,expiration,created,quick,active,restriction);
INSERT INTO share_backup SELECT id,item_id,type,name,user_id,expiration,created,1,active,restriction FROM share;
DROP TABLE share;

CREATE TABLE share (
  id char(32) PRIMARY KEY,
  item_id char(255) NOT NULL,
  type char(32) NULL,
  restriction char(32) NULL,
  name varchar(255) NOT NULL,
  user_id INTEGER NOT NULL,
  expiration bigint(11) NULL,
  created bigint(11) NOT NULL,
  quick TINYINT(1) NOT NULL,
  active TINYINT(1) NOT NULL
);

INSERT INTO share SELECT id,item_id,type,name,user_id,expiration,created,quick,active,restriction FROM share_backup;
DROP TABLE share_backup;