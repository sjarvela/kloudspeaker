<?php

/**
 * WatermarkingManager.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL license.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class WatermarkingManager {
	private $env;
	private $settings;

	function __construct($env, $settings) {
		$this->env = $env;
		$this->settings = $settings;
	}

	public function onAction($ac, $item) {
		if (FileEvent::DOWNLOAD != $ac or $item == NULL or !$item->isFile()) {
			return;
		}

		$user = $this->env->session()->user();
		if (!$user) {
			return;
		}

		$excludeUsers = $this->getSetting("exclude_users");
		if ($excludeUsers != NULL) {
			if (in_array($user["id"], $excludeUsers)) {
				Logging::logDebug("User excluded, ignoring: " . $user["id"]);
				return;
			}
		}
		$excludeGroups = $this->getSetting("exclude_groups");
		if ($excludeGroups != NULL) {
			$groups = $this->env->session()->userGroups();

			if ($groups != NULL) {
				foreach ($groups as $g) {
					if (in_array($g["id"], $excludeGroups)) {
						Logging::logDebug("User group excluded, ignoring: " . $g["id"]);
						return;
					}
				}
			}
		}

		$type = $item->extension();
		if (!$type or strlen($type) == 0) {
			return;
		}

		$types = $this->getSetting("types");
		if ($types == NULL or !array_key_exists($type, $types)) {
			return;
		}
		$watermark = $this->getWatermarkText($item, $user);
		if (!$watermark) {
			return;
		}

		$marker = $this->getMarker($type, $types[$type]);
		if (!$marker) {
			return;
		}

		$original = $item->internalPath();
		$file = $this->getTempFile($item, $type);

		Logging::logDebug("Watermarking [" . $original . "] -> temp [" . $file . "], mark [" . $watermark . "]");

		$marked = $marker->mark($original, $file, $watermark);
		if (!$marked) {
			return;
		}

		$handle = @fopen($file, "rb");
		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open file for reading: " . $file);
		}

		//TODO range support
		$mobile = ($this->env->request()->hasParam("m") and strcmp($this->env->request()->param("m"), "1") == 0);
		$this->env->events()->onEvent(FileEvent::download($item));
		$this->env->response()->download($item->name(), $type, $mobile, $handle);
		unlink($file);

		return TRUE;
	}

	private function getWatermarkText($item, $user) {
		$template = $this->getSetting("watermark_text", NULL);
		if ($template == NULL) {
			throw new ServiceException("INVALID_REQUEST", "No watermark text template");
		}
		$values = array("username" => $user["name"], "user_name" => $user["name"], "user_id" => $user["id"]);
		return Util::replaceParams($template, $values);
	}

	private function getTempFile($item, $type) {
		return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . uniqid('kloudspeaker', true) . $type;
	}

	private function getMarker($t, $def) {
		if (!$t or !$def) {
			return NULL;
		}

		$type = strtolower(trim($t));
		$id = $def;
		$conf = array();
		if (is_array($def)) {
			$id = $def["cls"];
			$conf = $def;
		}

		require_once "markers/MarkerBase.class.php";
		require_once "markers/" . $id . "/" . $id . ".marker.php";
		return new $id($this, $type, $id, $conf);
	}

	public function getSetting($name, $default = NULL) {
		if (!$this->settings or !isset($this->settings[$name])) {
			return $default;
		}

		return $this->settings[$name];
	}

	public function env() {
		return $this->env;
	}

	public function __toString() {
		return "WatermarkingManager";
	}
}
?>