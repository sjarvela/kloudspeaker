<?php

	/**
	 * ItemCollection.plugin.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	
	require_once("ItemCollectionHandler.class.php");
	require_once("ItemCollectionServices.class.php");
	
	class ItemCollection extends PluginBase {
		private $handler;
		
		public function version() {
			return "1_0";
		}

		public function versionHistory() {
			return array("1_0");
		}
		
		public function setup() {
			$this->env->features()->addFeature("itemcollection");
			$this->addService("itemcollections", "ItemCollectionServices");
			
			$this->handler = new ItemCollectionHandler($this->env, $this->getSettings());
			$this->env->events()->register("filesystem/", $this->handler);
			$this->env->events()->register("user/", $this->handler);
		}
		
		public function initialize() {
			if ($this->env->plugins()->hasPlugin("Share")) $this->env->plugins()->getPlugin("Share")->registerHandler("ic", $this->handler);
		}
				
		public function getHandler() {
			return $this->handler;
		}

		public function getClientModuleId() {
			return "kloudspeaker/itemcollection";
		}
				
		public function __toString() {
			return "ItemCollectionPlugin";
		}
	}
?>
