CREATE TABLE comment (
  id INTEGER PRIMARY KEY,
  item_id char(255) NOT NULL,
  user_id int(11) NOT NULL,
  time bigint(11) NOT NULL,
  comment varchar(1024) NOT NULL DEFAULT ''
);
INSERT INTO parameter (name, value) VALUES ('plugin_Comment_version', '1_0');