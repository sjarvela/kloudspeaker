UPDATE parameter SET value = '1_1' WHERE name = 'plugin_Registration_version';
CREATE TABLE registration (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  password varchar(128) NOT NULL,
  email varchar(128) NOT NULL,
  key char(64) NOT NULL,
  time bigint(11) NOT NULL,
  confirmed bigint(11) NULL
);
INSERT INTO registration SELECT id, name, password, email, key, time, NULL as confirmed FROM pending_registrations;
DROP TABLE pending_registrations;
