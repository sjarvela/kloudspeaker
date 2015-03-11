UPDATE `{TABLE_PREFIX}parameter` SET value = '1_1' WHERE name = 'plugin_Notificator_version';

ALTER TABLE `{TABLE_PREFIX}notificator_notification_event` DROP PRIMARY KEY;
ALTER TABLE `{TABLE_PREFIX}notificator_notification_event` ADD `id` int(11) NULL AFTER `notification_id`;

SET @count = 0;
UPDATE `{TABLE_PREFIX}notificator_notification_event` SET `id` = @count:= @count + 1;

ALTER TABLE `{TABLE_PREFIX}notificator_notification_event` ADD PRIMARY KEY (`id`);
ALTER TABLE `{TABLE_PREFIX}notificator_notification_event` MODIFY COLUMN `id` int(11) NOT NULL auto_increment;

CREATE TABLE `{TABLE_PREFIX}notificator_notification_event_filter` (
  `id` int(11) NOT NULL auto_increment,
  `notification_event_id` int(11) NOT NULL,
  `type` varchar(128) NOT NULL,
  `value` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_notificator_notification_event_filter_1` (`notification_event_id`)
) ENGINE = '{ENGINE}' COLLATE utf8_general_ci COMMENT = 'Notification event filter';