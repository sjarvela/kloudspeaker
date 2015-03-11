UPDATE `parameter` SET value = '1_0_0' WHERE name = 'version';

ALTER TABLE `user` CONVERT TO CHARACTER SET utf8;
ALTER TABLE `folder` CONVERT TO CHARACTER SET utf8;
ALTER TABLE `item_description` CONVERT TO CHARACTER SET utf8;
ALTER TABLE `item_permission` CONVERT TO CHARACTER SET utf8;
ALTER TABLE `user_folder` CONVERT TO CHARACTER SET utf8;
ALTER TABLE `parameter` CONVERT TO CHARACTER SET utf8;

UPDATE `item_permission` SET item_id = CONCAT(SUBSTR(item_id, 1, INSTR(item_id, ':')), '/', SUBSTR(item_id, INSTR(item_id, ':') + 1));
UPDATE `item_description` SET item_id = CONCAT(SUBSTR(item_id, 1, INSTR(item_id, ':')), '/', SUBSTR(item_id, INSTR(item_id, ':') + 1));

ALTER TABLE `item_permission` ADD `user_id` int( 11 ) NOT NULL DEFAULT '0' FIRST;
ALTER TABLE `item_permission` DROP PRIMARY KEY, ADD PRIMARY KEY ( `user_id`, `item_id` );
