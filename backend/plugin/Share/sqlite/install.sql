CREATE TABLE share (
  id char(32) PRIMARY KEY,
  item_id char(255) NOT NULL,
  restriction char(32) NULL,
  name varchar(255) NOT NULL,
  user_id INTEGER NOT NULL,
  expiration bigint(11) NULL,
  created bigint(11) NOT NULL,
  active TINYINT(1) NOT NULL
);
CREATE TABLE share_auth (
  id char(32) PRIMARY KEY,
  salt char(128) NOT NULL,
  hash char(128) NOT NULL
);
INSERT INTO parameter (name, value) VALUES ('plugin_Share_version', '1_3');