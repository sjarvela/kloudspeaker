UPDATE parameter SET value = '1_8_3' WHERE name = 'version';

CREATE TEMPORARY TABLE user_folder_backup(user_id,folder_id,name);
INSERT INTO user_folder_backup SELECT user_id,folder_id,name FROM user_folder;
DROP TABLE user_folder;

CREATE TABLE user_folder (
  user_id int(11) NOT NULL,
  folder_id int(11) NOT NULL,
  name varchar(255) NULL,
  path_prefix varchar(255) NULL,
  PRIMARY KEY (user_id,folder_id),
  FOREIGN KEY(folder_id) REFERENCES folder(id),
  FOREIGN KEY(user_id) REFERENCES user(id)
);

INSERT INTO user_folder SELECT user_id,folder_id,name,NULL FROM user_folder_backup;
DROP TABLE user_folder_backup;