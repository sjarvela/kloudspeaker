<?php

	/**
	 * 1_8_5.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	require_once("update/Conversion.php");
	
	class Upd_1_8_5 implements Conversion {
		public function run($installer) {
			$db = $installer->db();
			$tables = $this->getItemTables($installer);
			$ids = $this->createIds($tables, $db);
			$this->updateIds($tables, $ids, $db);
		}
		
		private function getItemTables($installer) {
			$plugins = $installer->processor()->plugins()->getPlugins();
			
			$tables = array("item_description", "item_permission");
			if (array_key_exists("Comment", $plugins)) $tables[] = "comment";
			if (array_key_exists("Notificator", $plugins)) $tables[] = "notificator_notification_item";
			return $tables;
		}
		
		private function createIds($tables, $db) {
			if (strcmp("mysql", $db->type()) === 0) mysqli_report(MYSQLI_REPORT_OFF);
			
			$ids = array();
			foreach ($tables as $t) {
				$old = $db->query("select distinct item_id from ".$db->table($t))->values("item_id");
				
				foreach($old as $id)
					if (!in_array($id, $ids)) $ids[$id] = $this->createId($id); 
			}
			if (strcmp("mysql", $db->type()) === 0) mysqli_report(MYSQLI_REPORT_ALL);
			return $ids;
		}
		
		private function updateIds($tables, $ids, $db) {
			if (strcmp("mysql", $db->type()) === 0) mysqli_report(MYSQLI_REPORT_OFF);
			
			Logging::logDebug("Converting ".count($ids)." ids in ".Util::array2str($tables));
			
			foreach($ids as $old => $new) {
				$db->update(sprintf("INSERT INTO ".$db->table("item_id")." (id, path) VALUES (%s,%s)", $db->string($new, TRUE), $db->string($old, TRUE)));
			}

			foreach ($tables as $t) {
				foreach($ids as $old => $new) {
					$db->update(sprintf("update ".$db->table($t)." set item_id=%s where item_id=%s", $db->string($new, TRUE), $db->string($old, TRUE)));
				}
			}
			if (strcmp("mysql", $db->type()) === 0) mysqli_report(MYSQLI_REPORT_ALL);
		}
		
		private function createId($id) {
			return uniqid("");
		}
	}
?>