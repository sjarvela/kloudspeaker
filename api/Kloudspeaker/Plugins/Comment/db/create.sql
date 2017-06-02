CREATE TABLE {TABLE_PREFIX}comment (
  id int(11) NOT NULL auto_increment,
  item_id char(255) NOT NULL,
  user_id int(11) NOT NULL,
  time bigint(11) NOT NULL,
  comment varchar(1024) NOT NULL DEFAULT '',
  PRIMARY KEY (id)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Comments';