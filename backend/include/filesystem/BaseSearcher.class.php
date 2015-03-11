<?php

	/**
	 * BaseSearcher.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */
	 			
	 abstract class BaseSearcher {
	 	public function key() {
	 		return get_class($this);
	 	}
	 	
		public function match($data, $item, $text) {
			return $this->getMatch($data, $item, $text);
		}
		
		protected abstract function getMatch($data, $item, $text);
		
		public function preData($parent, $text) {
			return NULL;
		}
	}
?>