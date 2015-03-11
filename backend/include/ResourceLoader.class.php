<?php

/**
 * ResourceLoader.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class ResourceLoader {
	private $env = NULL;
	private $customizationsFolder = NULL;

	function __construct($env) {
		$this->env = $env;
		$this->customizationsFolder = $env->settings()->setting("customizations_folder");
		if ($this->customizationsFolder != NULL) {
			set_include_path($this->getCustomizationsAbsoluteLocation("") . PATH_SEPARATOR . get_include_path());
		}
	}

	public function getSessionInfo() {
		return array(
			"custom_url" => $this->env->settings()->setting("customizations_folder_url"),
		);
	}

	public function loadTexts($file, $curDir) {
		$file .= ".txt";
		$cl = $this->getCustomizationsAbsoluteLocation($file);

		if ($cl != NULL) {
			Logging::logDebug("ResourceLoader: Seeking " . $cl);
			if (file_exists($cl)) {
				return $this->loadTextFile($cl);
			}

		}
		Logging::logDebug("ResourceLoader: Seeking " . $curDir . DIRECTORY_SEPARATOR . $file);
		return $this->loadTextFile($curDir . DIRECTORY_SEPARATOR . $file);
	}

	private function getCustomizationsAbsoluteLocation($file) {
		if ($this->customizationsFolder == NULL) {
			return NULL;
		}

		if (substr($this->customizationsFolder, 0, 1) == "/" or strpos($this->customizationsFolder, ":\\") > 0) {
			return $this->customizationsFolder . DIRECTORY_SEPARATOR . $file;
		}

		$root = $this->env->getScriptRootPath();
		return $this->truepath($root . DIRECTORY_SEPARATOR . $this->customizationsFolder) . DIRECTORY_SEPARATOR . $file;
	}

	private function loadTextFile($file) {
		if (!file_exists($file) || !is_readable($file)) {
			return FALSE;
		}

		$result = array();
		foreach (explode("\n", file_get_contents($file)) as $line) {
			$parts = explode("==", $line);
			if (count($parts) == 2) {
				$result[$parts[0]] = str_replace("\\n", "\n", $parts[1]);
			}
		}
		return $result;
	}

	public function loadCustomPlugin($id) {
		if ($this->customizationsFolder == NULL) {
			throw new ServiceException("INVALID_CONFIGURATION", "Cannot load custom plugin, no customization folder defined");
		}

		$cls = "plugin" . DIRECTORY_SEPARATOR . $id . DIRECTORY_SEPARATOR . $id . ".plugin.class.php";

		$path = $this->getCustomizationsAbsoluteLocation($cls);
		if (!file_exists($path)) {
			throw new ServiceException("INVALID_CONFIGURATION", "Plugin not found in customization folder: " . $path);
		}

		require_once $cls;
	}

	public function getCustomizationsPath() {
		return $this->getCustomizationsAbsoluteLocation("");
	}

	public function getCustomPluginUrl($id, $path) {
		if ($this->customizationsFolder == NULL) {
			throw new ServiceException("INVALID_CONFIGURATION", "Cannot resolve custom plugin URL, no customization folder URL defined");
		}

		$baseUrl = rtrim($this->env->settings()->setting("customizations_folder_url"), "/");
		return $baseUrl . "/plugin/" . $id . "/" . $path;
	}

	private function truepath($path) {
		// whether $path is unix or not
		$unipath = strlen($path) == 0 || $path{0} != '/';
		// attempts to detect if path is relative in which case, add cwd
		if (strpos($path, ':') === false && $unipath) {
			$path = getcwd() . DIRECTORY_SEPARATOR . $path;
		}

		// resolve path parts (single dot, double dot and double delimiters)
		$path = str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $path);
		$parts = array_filter(explode(DIRECTORY_SEPARATOR, $path), 'strlen');
		$absolutes = array();
		foreach ($parts as $part) {
			if ('.' == $part) {
				continue;
			}

			if ('..' == $part) {
				array_pop($absolutes);
			} else {
				$absolutes[] = $part;
			}
		}
		$path = implode(DIRECTORY_SEPARATOR, $absolutes);
		// resolve any symlinks
		if (file_exists($path) && linkinfo($path) > 0) {
			$path = readlink($path);
		}

		// put initial separator that could have been lost
		$path = !$unipath ? '/' . $path : $path;
		return $path;
	}
}
?>