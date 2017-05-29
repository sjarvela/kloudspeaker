<?php
namespace Kloudspeaker\Filesystem;

class ItemIdProvider {
	const PATH_DELIMITER = "/";

	public function __construct($container) {
		$this->container = $container;
		$this->convertPathDelimiter = (DIRECTORY_SEPARATOR != self::PATH_DELIMITER);
	}

	public function addFilter($q, $parent, $recursive = FALSE, $prefix = "i") {
		$p = $this->itemQueryPath($parent);
		$q->from("item_id", ["item_id"])->where("path", $p . "%", 'like');

		if ($recursive) {
			$q->and('level', $this->getLevel($parent) + 1);
		}
		/*$pathFilter = ($prefix != NULL ? $prefix . ".path" : "path") . " like '" . $this->env->db()->string(str_replace("'", "\'", $this->itemQueryPath($parent))) . "%'";
			if (!$recursive) {
				$pathFilter = $pathFilter . " and " . ($prefix != NULL ? $prefix . ".level" : "level") . "=" . ($this->getLevel($parent) + 1);
			}
		*/
	}

	private function itemQueryPath($i, $escape = FALSE) {
		$path = is_string($i) ? $i : $i->location();
		if ($this->convertPathDelimiter) {
			$path = str_replace(DIRECTORY_SEPARATOR, self::PATH_DELIMITER, $path);
		}
		if ($escape) {
			$path = Util::escapePathRegex($path, TRUE);
		}

		return $path;
	}

	private function getLevel($i) {
		$path = is_string($i) ? $i : $i->location();
		if ($this->convertPathDelimiter) {
			$path = str_replace(DIRECTORY_SEPARATOR, self::PATH_DELIMITER, $path);
		}
		return substr_count(substr($path, 0, -1), self::PATH_DELIMITER) + 1;
	}
}