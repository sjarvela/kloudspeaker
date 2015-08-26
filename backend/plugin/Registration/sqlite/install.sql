CREATE TABLE registration (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  password varchar(128) NOT NULL,
  password_hint varchar(128) NULL,
  email varchar(128) NOT NULL,
  key char(64) NOT NULL,
  time bigint(11) NOT NULL,
  confirmed bigint(11) NULL
);
INSERT INTO parameter (name, value) VALUES ('plugin_Registration_version', '1_2');