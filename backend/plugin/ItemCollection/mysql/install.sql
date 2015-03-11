CREATE TABLE `{TABLE_PREFIX}itemcollection` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created` bigint(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Item collections';

CREATE TABLE `{TABLE_PREFIX}itemcollection_item` (
  `collection_id` char(32) NOT NULL,
  `item_id` varchar(128) NOT NULL,
  `item_index` int(4) NOT NULL,
  PRIMARY KEY (`collection_id`,`item_id`),
  UNIQUE  `ui_itemcollection_item_idx` (`collection_id`, `item_index`),
  KEY `fk_itemcollection_item_1` (`collection_id`),
  KEY `fk_itemcollection_item_2` (`item_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Item collection items';

INSERT INTO `{TABLE_PREFIX}parameter` (name, value) VALUES ('plugin_ItemCollection_version', '1_0');