CREATE TABLE trashbin (
  id char(255) PRIMARY KEY,
  item_id char(255) NOT NULL,
  folder_id int(11) NOT NULL,
  path char(255) NOT NULL, 
  user_id int(11) NOT NULL,
  created bigint(11) NOT NULL
);
INSERT INTO parameter (name, value) VALUES ('plugin_TrashBin_version', '1_0');