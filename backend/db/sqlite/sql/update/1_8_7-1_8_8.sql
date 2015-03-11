UPDATE parameter SET value = '1_8_8' WHERE name = 'version';

CREATE TEMPORARY TABLE user_backup(id,time,user,type,item,details);
INSERT INTO user_backup SELECT id,name,description,password,a1password,permission_mode,email,auth,is_group FROM user;
DROP TABLE user;

CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  description varchar(255) NOT NULL DEFAULT '',
  password varchar(128) NULL,
  a1password varchar(128) NULL,
  permission_mode char(2) NULL,
  email varchar(128) NULL,
  auth varchar(8) NULL,
  is_group TINYINT(1) NOT NULL,
  expiration bigint(11) NULL
);

INSERT INTO user SELECT id,name,description,password,a1password,permission_mode,email,auth,is_group,NULL FROM user_backup;
DROP TABLE user_backup;