<?php

/**
 * Legacy.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

require_once('Logging.php');

$inc = __DIR__."/../../../backend/";
set_include_path($inc . PATH_SEPARATOR . get_include_path());

class KloudspeakerLegacy {
	public function __construct($config) {
		$this->config = $config;
	}

	public function initialize($app) {
		$this->app = $app;
		$this->container = $app->getContainer();
		\Logging::initialize($this->container->logger, $this->config->isDebug());

		require_once "include/event/EventHandler.class.php";
		require_once "include/configuration/ConfigurationDao.class.php";
		require_once "include/configuration/UserEvent.class.php";
		require_once "include/configuration/FolderEvent.class.php";

		require_once "include/filesystem/FilesystemController.class.php";
		require_once "plugin/PluginController.class.php";
		require_once "include/services/ServicesBase.class.php";
		require_once "include/permissions/PermissionsController.class.php";
		require_once "include/Formatter.class.php";
		require_once "include/ResourceLoader.class.php";
		require_once "include/commands/CommandsController.class.php";
		require_once "include/Util.class.php";

        $this->env = new LegacyEnvironment($this->container);
        $this->env->setup();
	}

	public function handleRequest($request) {
        $path = $this->config->getRootPath();
        $url = $request->getUri();

        $this->container->logger->debug($path.":".$url);

        $legacyRequest = Request::get(substr($url, strlen($path)));
        //$path = explode("/", );
        $this->env->request = $legacyRequest;

		$service = $this->env->getService($legacyRequest);
		if ($service == NULL) return FALSE;

		if (!$service->isAuthenticated()) {
			throw new ServiceException("UNAUTHORIZED");
		}
		
		$service->processRequest();
		//$this->container->logger->debug($path);
		return TRUE;
	}

	public function env() {
		return $this->env;
	}
}

class LegacyEnvironment {
	public $request;

	private $services = array();
	private $serviceControllerPaths = array();

	public function __construct($container) {
		$this->container = $container;

		$this->app = new LegacyApp($this);
		$this->db = new LegacyDb($container->db);
		$this->configuration = new ConfigurationDao($this->db);
		$this->authentication = new LegacyAuthentication($container);
		$this->session = new LegacySession($container);
		$this->settings = new LegacySettings($container->configuration);
		$this->plugins = new LegacyPlugins($container);
		$this->response = new LegacyResponse($container);
		$this->eventHandler = new EventHandler($this);
		$this->filesystem = new FilesystemController($this);
		$this->permissions = new Kloudspeaker_PermissionsController($this);
		$this->plugins = new PluginController($this);
		$this->resources = new ResourceLoader($this);
		$this->commands = new Kloudspeaker_CommandsController($this);

		$this->configuration->initialize($this);
		$this->filesystem->initialize();
		$this->permissions->initialize();
		$this->plugins->initialize($this);
	}

	public function setup() {
        $this->app->setup();
        $this->plugins->setup();
	}

	public function addService($id, $controller, $controllerPath = NULL) {
		$this->services[$id] = $controller;
		if ($controllerPath != NULL) {
			$this->serviceControllerPaths[$id] = $controllerPath;
		}
	}

	public function getService($request) {
		$path = $request->path();
		if (count($path) === 0) {
			throw new ServiceException("Empty request");
		}

		$id = $path[0];
		if (!array_key_exists($id, $this->services)) {
			throw new ServiceException("Unknown service '" . $id . "'");
		}

		$service = $this->createService($this->services[$id], $request, $id, array_slice($path, 1));
		if (Logging::isDebug()) {
			$service->log();
		}

		return $service;
	}

	private function createService($controller, $request, $id, $path) {
		$controllerPath = "include/services/";
		if (array_key_exists($id, $this->serviceControllerPaths)) {
			$controllerPath = $this->serviceControllerPaths[$id];
		}

		require_once $controllerPath . $controller . ".class.php";
		return new $controller($this, $request, $id, $path);
	}

	public function configuration() {
		return $this->configuration;
	}

	public function authentication() {
		return $this->authentication;
	}

	public function db() {
		return $this->db;
	}

	public function response() {
		return $this->response;
	}

	public function features() {
		return $this->container->features;
	}

	public function events() {
		return $this->eventHandler;
	}

	public function filesystem() {
		return $this->filesystem;
	}

	public function permissions() {
		return $this->permissions;
	}

	public function plugins() {
		return $this->plugins;
	}

	public function settings() {
		return $this->settings;
	}

	public function request() {
		return $this->request;
	}

	public function resources() {
		return $this->resources;
	}

	public function commands() {
		return $this->commands;
	}

	public function session() {
		return $this->session;
	}

	public function mailer() {
		if ($this->mailer == NULL) {
			$this->mailer = $this->createMailSender();
		}

		return $this->mailer;
	}

	public function urlRetriever() {
		if ($this->urlRetriever == NULL) {
			$this->urlRetriever = $this->createUrlRetriever();
		}

		return $this->urlRetriever;
	}

	public function imageGenerator() {
		if ($this->imageGenerator == NULL) {
			$this->imageGenerator = $this->createImageGenerator();
		}

		return $this->imageGenerator;
	}

	public function thumbnailGenerator() {
		require_once "include/Thumbnail.class.php";
		return new Thumbnail($this);
	}

	public function formatter() {
		return new Formatter($this);
	}

	private function createMailSender() {
		require_once $this->settings->setting("mail_sender_class");
		return new Kloudspeaker_MailSender($this);
	}

	private function createUrlRetriever() {
		require_once $this->settings->setting("url_retriever_class");
		return new UrlRetriever($this);
	}

	private function createImageGenerator() {
		require_once $this->settings->setting("image_generator_class");
		return new ImageGenerator($this);
	}

	public function convertCharset($s, $encode = TRUE) {
		$cs = $this->settings->setting("convert_filenames", TRUE);
		if (!$cs) {
			return $s;
		}

		if ($cs === TRUE) {
			$cs = NULL;
		}

		return Util::convertCharset($s, $cs, $encode);
	}

	public function getServiceUrl($id, $path, $full = FALSE) {
		$url = '';
		if ($full) {
			$url = $this->getHost();
		}

		$url .= "/" . $id;
		foreach ($path as $p) {
			$url .= "/" . $p;
		}

		return $url . "/";
	}

	public function getPluginBaseUrl() {
		return $this->getResourceUrl("plugin/");
	}

	public function getPluginUrl($pluginId, $path = NULL, $file = FALSE) {
		return $this->getPluginBaseUrl() . $pluginId . "/" . ($path != NULL ? $path . ($file ? "" : "/"):"");
	}

	public function getClientUrl($path) {
		$url = $this->getHost() . $_SERVER['SCRIPT_NAME'];
		$url = substr($url, 0, strpos($url, "backend"));
		$page = $this->settings()->setting("client_page");
		if ($page != NULL) {
			$url .= $page;
		}
		return $url . $path;
	}

	public function getResourceUrl($path) {
		return $this->getRootUrl() . $path;
	}

	public function getCommonResourcesUrl() {
		return $this->getRootUrl() . 'resources/';
	}

	private function getHost() {
		/*if (!$this->settings->hasSetting("host_public_address")) {
			if (!isset($_SERVER['HTTP_REFERER'])) {
				throw new ServiceException("Cannot resolve host");
			}

			$protocol = substr($_SERVER['HTTP_REFERER'], 0, strpos($_SERVER['HTTP_REFERER'], ":"));
			$start = strlen($protocol) + 3;
			$end = strpos($_SERVER['HTTP_REFERER'], "/", $start);
			if ($end > 0) {
				$host = substr($_SERVER['HTTP_REFERER'], $start, $end - $start);
			} else {
				$host = substr($_SERVER['HTTP_REFERER'], $start);
			}

			return $protocol . "://" . $host;
		}

		return $this->settings->setting("host_public_address");*/
		return $this->container->configuration->getRootPath();
	}

	private function getRootUrl() {
		$root = substr($_SERVER['SCRIPT_NAME'], 0, strlen($_SERVER['SCRIPT_NAME']) - strlen(self::ENTRY_SCRIPT));
		return $this->getHost() . $root;
	}

	public function getScriptRootPath() {
		return substr($_SERVER['SCRIPT_FILENAME'], 0, strlen($_SERVER['SCRIPT_FILENAME']) - strlen(self::ENTRY_SCRIPT));
	}
}

class LegacyDb {
	public function __construct($db) {
		$this->db = $db;
	}

	public function type() {
		return "mysql";	//TODO
	}

	public function table($name) {
		//TODO prefix
		return $name;
	}

	public function query($q) {
		return $this->db->query($q);
	}

	public function update($query) {
		$result = $this->db->query($query);
		$affected = $result->affected();
		$result->free();
		return $affected;
	}

	public function arrayString($a, $quote = FALSE) {
		$result = '';
		$first = TRUE;
		foreach ($a as $s) {
			if (!$first) {
				$result .= ',';
			}

			if ($quote) {
				$result .= "'" . $s . "'";
			} else {
				$result .= $s;
			}

			$first = FALSE;
		}
		return $result;
	}

	public function string($s, $quote = FALSE) {
		if ($s === NULL) {
			return 'NULL';
		}

		$r = $this->db->db()->quote($s);
		if (!$quote) {
			return trim($r, "'");
		}

		return $r;
	}

	public function lastId() {
		return $this->db->lastInsertId();
	}
}

class LegacyAuthentication {
	public function __construct($container) {
		$this->container = $container;
	}

	public function isAuthenticated() {
		return $this->container->session->isLoggedIn();
	}

	function assertAdmin() {
		if (!$this->isAdmin()) {
			throw new ServiceException("NOT_AN_ADMIN");
		}
	}

	function isAdmin() {
		return $this->container->session->isAdmin();
	}
}

class LegacySession {
	public function __construct($container) {
		$this->container = $container;
	}

	public function user() {
		$user = $this->container->session->getUser();
		return $user;
	}

	public function username() {
		$user = $this->container->session->getUser();
		return $user != NULL ? $user["name"] : NULL;
	}

	public function userId() {
		$user = $this->container->session->getUser();
		return $user != NULL ? $user["id"] : NULL;
	}

	public function isActive() {
		return $this->container->session->getId() != NULL;
	}

	public function hasUserGroups() {
		//TODO
		return FALSE;
	}

	public function userGroups() {
		//TODO
		return [];
	}

	public function getSessionInfo() {
		return array();
	}
}

class LegacySettings {
	private static $DEFAULT_VALUES = array(
		"plugins" => [],
		"session_time" => 7200,

		"enable_change_password" => TRUE,
		"enable_descriptions" => TRUE,
		"enable_mail_notification" => FALSE,
		"enable_limited_http_methods" => FALSE,
		"enable_retrieve_url" => FALSE,
		"enable_thumbnails" => FALSE,
		"enable_folder_protection" => FALSE,
		"enable_guest_mode" => FALSE,

		"server_hash_salt" => "KLOUDSPEAKER_SERVER_SALT",
		"email_login" => FALSE,
		"allowed_file_upload_types" => array(),
		"forbidden_file_upload_types" => array(),
		"firebug_logging" => FALSE,
		"mail_notification_from" => "Admin",
		"new_folder_permission_mask" => 0755,
		"convert_filenames" => FALSE,
		"show_hidden_files" => FALSE,
		"support_output_buffer" => FALSE,
		"mail_sender_class" => "mail/MailSender.class.php",
		"url_retriever_class" => "UrlRetriever.class.php",
		"image_generator_class" => "ImageGenerator.class.php",
		"datetime_format" => "d.m.Y H:i:s",
		"mime_types" => array(),
		"authentication_methods" => array("pw"),
		"ldap_use_starttls" => FALSE,
		"ldap_conn_string" => NULL,
		"upload_temp_dir" => NULL,
		"guest_user_id" => FALSE,
		"debug" => FALSE,
		"no_dev_urandom" => FALSE,
		"ignored_items" => FALSE
	);

	public function __construct($config) {
		$this->config = $config;
	}

	public function hasSetting($name) {
		return $this->config->has($name);
	}

	public function setting($name) {
		return $this->config->get($name, array_key_exists($name, self::$DEFAULT_VALUES) ? self::$DEFAULT_VALUES[$name] : NULL);
	}
}

class LegacyResponse {
	public function __construct($container) {
		$this->container = $container;
	}

	public function download($filename, $type, $mobile, $stream, $size = NULL, $range = NULL) {
		//TODO
	}

	public function sendFile($file, $name, $type, $mobile, $size = NULL) {
		//TODO
	}

	public function send($filename, $type, $stream, $size = NULL, $range = NULL) {
		//TODO
	}

	public function html($html) {
		//TODO
	}

	public function success($data) {
		$this->container->out->success($data);
	}

	public function fail($code, $error, $details = NULL, $data = NULL) {
		//TODO
	}

	public function error($type, $details, $data = NULL) {
		//TODO
	}

	public function redirect($url) {
		//TODO
	}

	public function unknownServerError($msg) {
		//TODO
	}
}

class LegacyApp {
	public function __construct($environment) {
		$this->environment = $environment;
	}

	public function setup() {
		//$this->environment->addService("authentication", "AuthenticationServices");
		$this->environment->addService("configuration", "ConfigurationServices");
		$this->environment->addService("filesystem", "FilesystemServices");
		$this->environment->addService("events", "EventServices");
		$this->environment->addService("permissions", "PermissionServices");
		
		UserEvent::register($this->environment->events());
		FolderEvent::register($this->environment->events());
		
		$this->environment->permissions()->registerPermission("change_password");
		
		$this->environment->plugins()->setup();
	}
}

class LegacyPlugins {
	public function __construct($container) {
		$this->container = $container;
	}

	public function setup() {

	}
}

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

	public static function get($uri = "", $raw = FALSE) {
		$method = isset($_SERVER['REQUEST_METHOD']) ? strtolower($_SERVER['REQUEST_METHOD']) : NULL;
		$uri = $uri;
		$ip = self::getIp();

		if (isset($_SERVER['HTTP_KLOUDSPEAKER_HTTP_METHOD'])) {
			$method = strtolower($_SERVER['HTTP_KLOUDSPEAKER_HTTP_METHOD']);
		}

		$p = stripos($uri, "?");
		if ($p) {
			$uri = trim(substr($uri, 0, $p), "/");
		}

		$params = self::getParams($method);
		$parts = explode("/", rtrim($uri, "/"));

		$data = self::getData($method, $raw, $params);

		return new Request(self::getKloudspeakerSessionId($params), $method, $uri, $ip, $parts, $params, $data);
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
		if ($this->hasParam($param))
			return $this->params[$param];
		return NULL;
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

class ServiceException extends Exception {
	private $type;
	private $data;

	public function __construct($type, $details = "", $data = NULL) {
		parent::__construct($details);
		$this->type = $type;
		$this->errorCode = $this->resolveErrorCode($type);
		$this->data = $data;
	}

	function getHttpCode() {
    	if ($this->errorCode === \Kloudspeaker\Errors::NotAuthenticated)
    		return \Kloudspeaker\HttpCodes::FORBIDDEN;
		return \Kloudspeaker\HttpCodes::INTERNAL_ERROR;
	}

	function resolveErrorCode() {
		//TODO
		if ($this->type == 'UNAUTHORIZED')
			return \Kloudspeaker\Errors::NotAuthenticated;
		return \Kloudspeaker\Errors::Unknown;
	}

	function getErrorCode() {
		return $this->errorCode;
	}

	function getResult() {
		return $this->data;
	}

	function type() {
		return $this->type;
	}

	function data() {
		return $this->data;
	}

	function details() {
		return $this->getMessage();
	}
}