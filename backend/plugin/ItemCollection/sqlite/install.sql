CREATE TABLE itemcollection (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  user_id int(11) NOT NULL,
  created bigint(11) NOT NULL
);

CREATE TABLE itemcollection_item (
  collection_id INTEGER NOT NULL,
  item_id varchar(128) NOT NULL,
  item_index int(4) NOT NULL,
  PRIMARY KEY (collection_id,item_id),
  FOREIGN KEY (collection_id) REFERENCES itemcollection(id),
  FOREIGN KEY (item_id) REFERENCES item_id(id)
);

CREATE INDEX ui_itemcollection_item_idx ON itemcollection_item (collection_id, item_index);

INSERT INTO parameter (name, value) VALUES ('plugin_ItemCollection_version', '1_0');
