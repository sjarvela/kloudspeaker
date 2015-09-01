<?php

/**
 * Request.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Request {
	const METHOD_GET = 'get';
	const METHOD_HEAD = 'head';
	const METHOD_PUT = 'put';
	const METHOD_POST = 'post';
	const METHOD_DELETE = 'delete';

	private $sessionId;
	private $method;
	private $uri;
	private $parts;
	private $params = array();
	private $ip;
	private $raw;

	public static function get($raw = FALSE) {
		$method = isset($_SERVER['REQUEST_METHOD']) ? strtolower($_SERVER['REQUEST_METHOD']) : NULL;
		$uri = self::getUri();
		$ip = self::getIp();

		if (isset($_SERVER['HTTP_KLOUDSPEAKER_HTTP_METHOD'])) {
			$method = strtolower($_SERVER['HTTP_KLOUDSPEAKER_HTTP_METHOD']);
		}

		$p = stripos($uri, "?");
		if ($p) {
			$uri = trim(substr($uri, 0, $p), "/");
		}

		$params = self::getParams($method);
		$parts = array();
		if (strlen($uri) > 0) {
			$parts = explode("/", $uri);
		} else {
			if (array_key_exists("sp", $params)) {
				$parts = explode("/", trim($params["sp"], "/"));
			}
		}

		$data = self::getData($method, $raw, $params);

		return new Request(self::getKloudspeakerSessionId($params), $method, $uri, $ip, $parts, $params, $data);
	}

	private static function getUri() {
		$uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : $_SERVER['PHP_SELF'];
		$pos = strpos($uri, "/r.php/");
		if ($pos === FALSE) {
			return "";
		}

		return trim(substr($uri, $pos + 7), "/");
	}

	private static function getIp() {
		if (function_exists("apache_request_headers")) {
			$headers = apache_request_headers();

			if (array_key_exists('X-Forwarded-For', $headers)) {
				return $headers['X-Forwarded-For'] . ' via ' . $_SERVER["REMOTE_ADDR"];
			}

		}

		return isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "local";
	}

	private static function getParams($method) {
		if (!$method) return array();

		switch ($method) {
			case self::METHOD_GET:
			case self::METHOD_HEAD:
				return $_GET;

			case self::METHOD_POST:
			case self::METHOD_PUT:
			case self::METHOD_DELETE:
				return $_REQUEST;
		}
	}

	private static function getKloudspeakerSessionId($params) {
		if (isset($params['session'])) {
			return $params["session"];
		}

		if (isset($_SERVER['HTTP_KLOUDSPEAKER_SESSION_ID'])) {
			return $_SERVER['HTTP_KLOUDSPEAKER_SESSION_ID'];
		}

		return NULL;
	}

	private static function getData($method, $raw, $params) {
		if (!$method) return NULL;
		
		switch ($method) {
			case self::METHOD_GET:
			case self::METHOD_HEAD:
				break;

			case self::METHOD_POST:
			case self::METHOD_PUT:
			case self::METHOD_DELETE:

				if (!$raw and (!isset($params['format']) or $params['format'] != 'binary')) {
					$data = file_get_contents("php://input");
					if ($data and strlen($data) > 0) {
						return json_decode($data, TRUE);
					}

				}
				break;
			default:
				throw new Exception("Unsupported method: " . $method);
		}
		return NULL;
	}

	public function __construct($sessionId, $method, $uri, $ip, $parts, $params, $data) {
		$this->sessionId = $sessionId;
		$this->method = $method;
		$this->uri = $uri;
		$this->ip = $ip;
		$this->parts = $parts;
		$this->params = $params;
		$this->data = $data;
	}

	public function getSessionId() {
		return $this->sessionId;
	}

	public function method() {
		return $this->method;
	}

	public function URI() {
		return $this->uri;
	}

	public function path($index = NULL) {
		if ($index == NULL) {
			return $this->parts;
		}

		return $this->parts[$index];
	}

	public function ip() {
		return $this->ip;
	}

	public function params() {
		return $this->params;
	}

	public function hasParam($param) {
		return array_key_exists($param, $this->params);
	}

	public function hasParamValue($p, $v) {
		return ($this->hasParam($p) and (strcmp($this->param($p), $v) == 0));
	}

	public function param($param) {
		return $this->params[$param];
	}

	public function hasData($key = NULL) {
		if ($key === NULL) {
			return ($this->data != NULL);
		}

		if (!is_array($this->data)) {
			return FALSE;
		}

		return array_key_exists($key, $this->data);
	}

	public function data($key) {
		return $this->data[$key];
	}

	public function header($key) {
		//TODO extract
		$headerKey = 'HTTP_' . $key;
		return $_SERVER[$headerKey];
	}

	public function log() {
		Logging::logDebug("REQUEST: method=" . $this->method . ", path=" . Util::array2str($this->parts) . ", ip=" . $this->ip . ", params=" . Util::array2str($this->params) . ", data=" . Util::toString($this->data));
	}

	public function __toString() {
		return "Request";
	}
}

class Response {
	private $code;
	private $type;
	private $data;

	public function __construct($code, $type, $data) {
		$this->code = $code;
		$this->type = $type;
		$this->data = $data;
	}

	public function code() {
		return $this->code;
	}

	public function type() {
		return $this->type;
	}

	public function data() {
		return $this->data;
	}
}
?>