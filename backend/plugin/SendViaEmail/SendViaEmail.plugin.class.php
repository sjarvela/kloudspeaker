<?php

/**
 * SendViaEmail.plugin.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

//require_once("SendViaEmail.class.php");

class SendViaEmail extends PluginBase {
	private $handler;

	public function setup() {
		$this->addService("sendviaemail", "SendViaEmailServices");
	}

	public function getClientPlugin() {
		return "client/plugin.js";
	}

	public function __toString() {
		return "SendViaEmailPlugin";
	}
}
?>
