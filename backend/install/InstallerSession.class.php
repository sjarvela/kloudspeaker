<?php

	/**
	 * InstallerSession.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	class InstallerSession extends Session {
		public function __construct($useCookie) {
			parent::__construct($useCookie);
		}
		
		protected function findSessionUser($id) {
			$db = $this->env->db();
			return $db->query(sprintf("SELECT id, name, email FROM ".$db->table("user")." WHERE id='%s'", $db->string($id)))->firstRow();
		}
	}
?>