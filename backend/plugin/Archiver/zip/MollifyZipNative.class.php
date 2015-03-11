<?php

/**
 * MollifyZipNative.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class MollifyZipNative implements MollifyCompressor {
	private static $availableCommands = NULL;

	private static function availableCommands() {
		if (self::$availableCommands != NULL) {
			return self::$availableCommands;
		}

		self::$availableCommands = array();

		exec('tar --version', $o, $ctar);
		if ($ctar == 0) {
			self::$availableCommands['application/x-tar'] = array('cmd' => 'tar', 'argc' => '-cf', 'ext' => 'tar');
			exec('gzip --version', $o, $c);
			if ($c == 0) {
				self::$availableCommands['application/x-gzip'] = array('cmd' => 'tar', 'argc' => '-czf', 'ext' => 'tgz');
			}
			exec('bzip2 --version', $o, $c);
			if ($c == 0) {
				self::$availableCommands['application/x-bzip2'] = array('cmd' => 'tar', 'argc' => '-cjf', 'ext' => 'tbz');
			}
		}

		exec('zip --version', $o, $c);
		if ($c == 0) {
			self::$availableCommands['application/zip'] = array('cmd' => 'zip', 'argc' => '-r9', 'ext' => 'zip');
		}

		exec('rar --version', $o, $c);
		if ($c == 0) {
			self::$availableCommands['application/x-rar'] = array('cmd' => 'rar', 'argc' => 'a inul', 'ext' => 'rar');
		}

		exec('7z --help', $o, $c);
		if ($c == 0) {
			self::$availableCommands['application/x-7z-compressed'] = array('cmd' => '7z', 'argc' => 'a', 'ext' => '7z');

			if (empty(self::$availableCommands['application/x-gzip'])) {
				self::$availableCommands['application/x-gzip'] = array('cmd' => '7z', 'argc' => 'a -tgzip', 'ext' => 'tar.gz');
			}
			if (empty(self::$availableCommands['application/x-bzip2'])) {
				self::$availableCommands['application/x-bzip2'] = array('cmd' => '7z', 'argc' => 'a -tbzip2', 'ext' => 'tar.bz');
			}
			if (empty(self::$availableCommands['application/zip'])) {
				self::$availableCommands['application/zip'] = array('cmd' => '7z', 'argc' => 'a -tzip -l', 'ext' => 'zip');
			}
			if (empty(self::$availableCommands['application/x-tar'])) {
				self::$availableCommands['application/x-tar'] = array('cmd' => '7z', 'argc' => 'a -ttar -l', 'ext' => 'tar');
			}
		}

		return self::$availableCommands;
	}

	private static function command($mode) {
		$cmds = self::availableCommands();
		if (!isset($cmds[$mode])) {
			return NULL;
		}

		return $cmds[$mode];
	}

	private $env;
	private $name;
	private $cmd;
	private $files = array();

	function __construct($env) {
		$this->env = $env;
		$this->name = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('Mollify', true) . 'zip';
		$this->cmd = self::command('application/zip');
		if ($this->cmd == NULL) {
			throw new ServiceException("INVALID_CONFIGURATION", "No native zip library found");
		}
	}

	public function acceptFolders() {
		return true;
	}

	public function add($name, $path, $size = 0) {
		if (is_file($path) || is_dir($path)) {
			$this->files[] = realpath($path);
		}
	}

	public function addEmptyDir($name) {
		//TODO
	}

	function common_path($dirList) {
		$dirList = array_unique($dirList);
		while (1 !== count($dirList)) {
			$dirList = array_map('dirname', $dirList);
			$dirList = array_unique($dirList);
		}
		reset($dirList);

		return current($dirList);
	}

	function relative_path($from, $to) {
		$from = explode(DIRECTORY_SEPARATOR, $from);
		$to = explode(DIRECTORY_SEPARATOR, $to);
		foreach ($from as $depth => $dir) {
			if (isset($to[$depth])) {
				if ($dir === $to[$depth]) {
					unset($to[$depth]);
					unset($from[$depth]);
				} else {
					break;
				}
			}
		}
		//$rawresult = implode('/', $to);
		for ($i = 0; $i < count($from) - 1; $i++) {
			array_unshift($to, '..');
		}
		$result = implode(DIRECTORY_SEPARATOR, $to);
		return $result;
	}

	public function finish() {
		$common_path_use = false;
		$common_path = $this->common_path($this->files);
		if (is_dir($common_path)) {
			$common_path_use = true;
			if (substr($common_path, -1) != DIRECTORY_SEPARATOR) {
				$common_path .= DIRECTORY_SEPARATOR;
			}
		}

		$argc = '';

		foreach ($this->files as $file) {
			if ($common_path_use) {
				$argc .= escapeshellarg('.' . DIRECTORY_SEPARATOR . $this->relative_path($common_path, $file)) . ' ';
			} else {
				$argc .= escapeshellarg($file) . ' ';
			}
		}

		$cwd = getcwd();
		if ($common_path_use) {
			chdir($common_path);
		}

		$cmd = $this->cmd['cmd'] . ' ' . $this->cmd['argc'] . ' ' . escapeshellarg($this->name) . ' ' . $argc;

		exec($cmd, $o, $c);

		if ($common_path_use) {
			chdir($cwd);
		}

		$this->opened = false;

		if (file_exists($this->name)) {
			return true;
		} else {
			// Unable to create archive
			return false;
		}
	}

	public function stream() {
		if (!file_exists($this->name)) {
			return 0;
		}

		$handle = @fopen($this->name, "rb");
		if (!$handle) {
			throw new ServiceException("REQUEST_FAILED", "Could not open zip for reading: " . $this->name);
		}

		return $handle;
	}

	public function filename() {
		return $this->name;
	}
}
?>