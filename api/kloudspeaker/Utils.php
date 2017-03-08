<?php

namespace Kloudspeaker;

/**
 * Utils.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Utils {
	public static function strStartsWith($haystack, $needle) {
	     $length = strlen($needle);
	     return (substr($haystack, 0, $length) === $needle);
	}

	public static function strEndsWith($haystack, $needle) {
	    $length = strlen($needle);
	    if ($length == 0) {
	        return true;
	    }

	    return (substr($haystack, -$length) === $needle);
	}

	public static function strList($s, $count, $delimiter = ",") {
		$r = "";
		for ($i=0; $i < $count; $i++) { 
			$r .= $s;
			if ($i < $count-1) $r .= $delimiter;
		}
		return $r;
	}

	public static function escapePathRegex($p, $double = TRUE) {
		$rp = $p;		
		$rp = str_replace("'", "\'", str_replace("*", "\*", str_replace("+", "\+", $rp)));
		if ($double) $rp = str_replace("\\", "\\\\", $rp);
		return $rp;
	}
	
	public static function inBytes($a) {
		$amount = trim($a);
		$last = strtolower($amount[strlen($amount) - 1]);
		$amount = substr($amount, 0, -1);

		switch ($last) {
			case 'g':
				$amount *= 1024;
			case 'm':
				$amount *= 1024;
			case 'k':
				$amount *= 1024;
		}

		return (float) $amount;
	}

	function base64_url_encode($input) {
		return strtr(base64_encode($input), '+/=', '-_,');
	}

	function base64_url_decode($input) {
		return base64_decode(strtr($input, '-_,', '+/='));
	}

	static function toString($a) {
		if (is_array($a)) {
			return self::array2str($a);
		}

		if (is_object($a)) {
			if (method_exists($a, '__toString')) {
				return '' . $a;
			}

			return get_class($a);
		}
		return $a;
	}

	static function array2str($a, $ignoredKeys = NULL) {
		if ($a === NULL) {
			return "NULL";
		}

		$r = "{";
		$first = TRUE;
		foreach ($a as $k => $v) {
			if ($ignoredKeys != null and in_array($k, $ignoredKeys)) {
				continue;
			}

			if (!$first) {
				$r .= ", ";
			}

			$val = self::toString($v);
			$r .= $k . ':' . $val;
			$first = FALSE;
		}
		return $r . "}";
	}

	static function isAssocArray($arr) {
		return array_keys($arr) !== range(0, count($arr) - 1);
	}

	static function isArrayKey($a, $k) {
		return $a != NULL and isset($a[$k]) and $a[$k] != NULL;
	}

	static function convertArrayCharset($a) {
		$result = array();
		foreach ($a as $k => $v) {
			if (is_array($v)) {
				$result[$k] = self::convertArrayCharset($v);
			} else {
				$result[$k] = self::convertCharset($v);
			}

		}
		return $result;
	}

	static function charStr($v, $e) {
		$cl = "";
		$chars = array();
		if ($e == "UTF-8") {
			preg_match_all('/./u', $v, $chars);
			foreach ($chars[0] as $c) {
				$cl .= '[' . $c . '](' . ord($c) . ')';
			}
		} else {
			for ($i = 0; $i < strlen($v); $i++) {
				$cl .= '[' . $v[$i] . '](' . ord($v[$i]) . ')';
			}
		}

		return $cl;
	}

	static function convertCharset($v, $charset = NULL, $encode = TRUE) {
		if (!$charset or $charset === NULL) {
			if ($encode) {
				return utf8_encode($v);
			}

			return utf8_decode($v);
		}
		if ($charset == "windows") {
			if ($encode) {
				return self::winCpToUtf8($v);
			}

			return self::utf8ToWinCp($v);
		}
		$from = $encode ? $charset : 'UTF-8';
		$to = $encode ? 'UTF-8' : $charset;
		return iconv($from, $to, $v);
	}

	static function winCpToUtf8($str) {
		static $winCpToUtfTbl = null;
		if (!$winCpToUtfTbl) {
			$winCpToUtfTbl = array_combine(range("\x80", "\xff"), array(
				"\xe2\x82\xac", "\xef\xbf\xbd", "\xe2\x80\x9a", "\xc6\x92",
				"\xe2\x80\x9e", "\xe2\x80\xa6", "\xe2\x80\xa0", "\xe2\x80\xa1",
				"\xcb\x86", "\xe2\x80\xb0", "\xef\xbf\xbd", "\xe2\x80\xb9",
				"\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xef\xbf\xbd", "\xe2\x80\x98", "\xe2\x80\x99", "\xe2\x80\x9c",
				"\xe2\x80\x9d", "\xe2\x80\xa2", "\xe2\x80\x93", "\xe2\x80\x94",
				"\xcb\x9c", "\xe2\x84\xa2", "\xef\xbf\xbd", "\xe2\x80\xba",
				"\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xc2\xa0", "\xc2\xa1", "\xc2\xa2", "\xc2\xa3", "\xe2\x82\xaa",
				"\xc2\xa5", "\xc2\xa6", "\xc2\xa7", "\xc2\xa8", "\xc2\xa9",
				"\xc3\x97", "\xc2\xab", "\xc2\xac", "\xc2\xad", "\xc2\xae",
				"\xc2\xaf", "\xc2\xb0", "\xc2\xb1", "\xc2\xb2", "\xc2\xb3",
				"\xc2\xb4", "\xc2\xb5", "\xc2\xb6", "\xc2\xb7", "\xc2\xb8",
				"\xc2\xb9", "\xc3\xb7", "\xc2\xbb", "\xc2\xbc", "\xc2\xbd",
				"\xc2\xbe", "\xc2\xbf", "\xd6\xb0", "\xd6\xb1", "\xd6\xb2",
				"\xd6\xb3", "\xd6\xb4", "\xd6\xb5", "\xd6\xb6", "\xd6\xb7",
				"\xd6\xb8", "\xd6\xb9", "\xef\xbf\xbd", "\xd6\xbb", "\xd6\xbc",
				"\xd6\xbd", "\xd6\xbe", "\xd6\xbf", "\xd7\x80", "\xd7\x81",
				"\xd7\x82", "\xd7\x83", "\xd7\xb0", "\xd7\xb1", "\xd7\xb2",
				"\xd7\xb3", "\xd7\xb4", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xef\xbf\xbd", "\xd7\x90", "\xd7\x91", "\xd7\x92", "\xd7\x93",
				"\xd7\x94", "\xd7\x95", "\xd7\x96", "\xd7\x97", "\xd7\x98",
				"\xd7\x99", "\xd7\x9a", "\xd7\x9b", "\xd7\x9c", "\xd7\x9d",
				"\xd7\x9e", "\xd7\x9f", "\xd7\xa0", "\xd7\xa1", "\xd7\xa2",
				"\xd7\xa3", "\xd7\xa4", "\xd7\xa5", "\xd7\xa6", "\xd7\xa7",
				"\xd7\xa8", "\xd7\xa9", "\xd7\xaa", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xe2\x80\x8e", "\xe2\x80\x8f", "\xef\xbf\xbd",
			));
		}
		return strtr($str, $winCpToUtfTbl);
	}

	static function utf8ToWinCp($str) {
		static $utfToWinCpTbl = null;
		if (!$utfToWinCpTbl) {
			$utfToWinCpTbl = array_combine(array(
				"\xe2\x82\xac", "\xef\xbf\xbd", "\xe2\x80\x9a", "\xc6\x92",
				"\xe2\x80\x9e", "\xe2\x80\xa6", "\xe2\x80\xa0", "\xe2\x80\xa1",
				"\xcb\x86", "\xe2\x80\xb0", "\xef\xbf\xbd", "\xe2\x80\xb9",
				"\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xef\xbf\xbd", "\xe2\x80\x98", "\xe2\x80\x99", "\xe2\x80\x9c",
				"\xe2\x80\x9d", "\xe2\x80\xa2", "\xe2\x80\x93", "\xe2\x80\x94",
				"\xcb\x9c", "\xe2\x84\xa2", "\xef\xbf\xbd", "\xe2\x80\xba",
				"\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xc2\xa0", "\xc2\xa1", "\xc2\xa2", "\xc2\xa3", "\xe2\x82\xaa",
				"\xc2\xa5", "\xc2\xa6", "\xc2\xa7", "\xc2\xa8", "\xc2\xa9",
				"\xc3\x97", "\xc2\xab", "\xc2\xac", "\xc2\xad", "\xc2\xae",
				"\xc2\xaf", "\xc2\xb0", "\xc2\xb1", "\xc2\xb2", "\xc2\xb3",
				"\xc2\xb4", "\xc2\xb5", "\xc2\xb6", "\xc2\xb7", "\xc2\xb8",
				"\xc2\xb9", "\xc3\xb7", "\xc2\xbb", "\xc2\xbc", "\xc2\xbd",
				"\xc2\xbe", "\xc2\xbf", "\xd6\xb0", "\xd6\xb1", "\xd6\xb2",
				"\xd6\xb3", "\xd6\xb4", "\xd6\xb5", "\xd6\xb6", "\xd6\xb7",
				"\xd6\xb8", "\xd6\xb9", "\xef\xbf\xbd", "\xd6\xbb", "\xd6\xbc",
				"\xd6\xbd", "\xd6\xbe", "\xd6\xbf", "\xd7\x80", "\xd7\x81",
				"\xd7\x82", "\xd7\x83", "\xd7\xb0", "\xd7\xb1", "\xd7\xb2",
				"\xd7\xb3", "\xd7\xb4", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xef\xbf\xbd", "\xd7\x90", "\xd7\x91", "\xd7\x92", "\xd7\x93",
				"\xd7\x94", "\xd7\x95", "\xd7\x96", "\xd7\x97", "\xd7\x98",
				"\xd7\x99", "\xd7\x9a", "\xd7\x9b", "\xd7\x9c", "\xd7\x9d",
				"\xd7\x9e", "\xd7\x9f", "\xd7\xa0", "\xd7\xa1", "\xd7\xa2",
				"\xd7\xa3", "\xd7\xa4", "\xd7\xa5", "\xd7\xa6", "\xd7\xa7",
				"\xd7\xa8", "\xd7\xa9", "\xd7\xaa", "\xef\xbf\xbd", "\xef\xbf\xbd",
				"\xe2\x80\x8e", "\xe2\x80\x8f", "\xef\xbf\xbd",
			), range("\x80", "\xff"));
		}
		return strtr($str, $utfToWinCpTbl);
	}

	static function replaceParams($text, $values) {
		foreach ($values as $k => $v) {
			$text = str_replace('%' . $k . '%', $v, $text);
		}

		return $text;
	}

	static function arrayCol($array, $col) {
		$list = array();
		foreach ($array as $r) {
			$list[] = $r[$col];
		}

		return $list;
	}

	static function map($array, $p) {
		$result = array();
		foreach ($array as $item) {
			$v = $item[$p];
			$result[$v] = $item;
		}
		return $result;
	}
}
?>
