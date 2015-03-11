<?php
// DON'T MODIFY THIS FILE
set_include_path('lib/' . PATH_SEPARATOR . $kloudspeaker_BACKEND_ROOT . PATH_SEPARATOR . get_include_path());

require_once "configuration.php";
require_once "include/Logging.class.php";
require_once "include/Util.class.php";

global $CONFIGURATION;
Logging::initialize($CONFIGURATION);

require_once "include/kloudspeakerBackend.class.php";
require_once "include/configuration/ConfigurationDao.class.php";
require_once "include/Settings.class.php";
require_once "include/Request.class.php";
require_once "Sabre.includes.php";

class VoidResponseHandler {
	public function addListener($l) {}
}

class WebDavSession extends Session {
	public function __construct() {
		parent::__construct(FALSE); // don't use cookies
	}

	public function init($user) {
		$this->id = "webdav_" . $_SERVER['REMOTE_ADDR'] . "_" . $this->user["id"];
		$this->user = $user;
	}

	protected function getDao() {
		return $this;
	}

	public function setValue($name, $value) {
		$now = $time = time();
		$time = $this->env->configuration()->formatTimestampInternal($now);

		$db = $this->env->db();
		$idStr = $db->string($this->id, TRUE);
		$timeStr = $db->string($time);

		$count = $db->update(sprintf("UPDATE " . $db->table("session") . " set last_access=%s where id=%s", $db->string($time), $db->string($this->id, TRUE)));
		if ($count === 0) {
			$ip = $_SERVER['REMOTE_ADDR'];
			$db->update(sprintf("INSERT INTO " . $db->table("session") . " (id, user_id, ip, time, last_access) VALUES (%s, %s, %s, %s, %s)", $idStr, $db->string($this->user["id"]), $db->string($ip, TRUE), $timeStr, $timeStr));
		}

		$c = $db->update(sprintf("UPDATE " . $db->table("session_data") . " set value=%s where session_id=%s and name=%s", $db->string($value, TRUE), $idStr, $db->string($name, TRUE)));
		if ($c === 0) {
			$db->update(sprintf("INSERT INTO " . $db->table("session_data") . " (session_id, name, value) VALUES (%s, %s, %s)", $idStr, $db->string($name, TRUE), $db->string($value, TRUE)));
		}
	}

	public function getValue($name) {
		$db = $this->env->db();
		$row = $db->query(sprintf("select name, value from " . $db->table("session_data") . " where session_id = %s and name=%s", $db->string($this->id, TRUE), $db->string($name, TRUE)))->firstRow();
		if ($row != NULL) {
			return $row["value"];
		}

		return NULL;
	}

	public function removeValue($name) {
		$db = $this->env->db();
		$db->update(sprintf("delete from " . $db->table("session_data") . " where session_id = %s and name=%s", $db->string($this->id, TRUE), $db->string($name, TRUE)));
	}

	// override session DAO persistence functions ->

	public function getSession($id, $lastValid = NULL) {
		return NULL;
	}

	public function getSessionData($id) {
		return array();
	}

	public function addSession($id, $userId, $ip, $time) {}

	public function addSessionData($id, $data) {}

	public function addOrSetSessionData($id, $name, $value) {}

	public function removeSession($id) {}

	public function updateSessionTime($id, $time) {}

	public function removeAllSessionBefore($time) {}
}

class kloudspeaker_DAV_Request {
	private $windowsClient = FALSE;

	public function init($rq) {
		$this->windowsClient = (stripos($rq->getHeader("user-agent"), "Microsoft") !== FALSE);
		Logging::logDebug("Windows: " . ($this->windowsClient ? "1" : "0"));
	}

	public function isWindowsClient() {
		return $this->windowsClient;
	}

	public function ip() {return $_SERVER['REMOTE_ADDR'];}

	public function getSessionId() {return NULL;}

	public function hasData($k) {return FALSE;}

	public function log() {}

	public function hasParam($param) {
		return $param == "request-origin";
	}

	public function param($param) {
		return ($param == "request-origin") ? "webdav" : NULL;
	}
}

function checkUploadSize() {
	global $MAX_FILE_SIZE;
	if (!isset($_SERVER['CONTENT_LENGTH']) or !isset($MAX_FILE_SIZE)) {
		return;
	}

	$size = $_SERVER['CONTENT_LENGTH'];
	if ($size > Util::inBytes($MAX_FILE_SIZE)) {
		throw new Sabre_DAV_Exception_Forbidden();
	}
}

class kloudspeaker_DAV_Root extends Sabre_DAV_Directory {
	private $env;
	private $roots;

	function __construct($env) {
		$this->env = $env;
		$this->roots = $this->env->filesystem()->getRootFolders();
	}

	function getChildren() {
		$children = array();
		foreach ($this->roots as $root) {
			$children[] = new kloudspeaker_DAV_Folder($this->env, $root);
		}

		return $children;
	}

	function getName() {
		return "kloudspeaker";
	}
}

class kloudspeaker_DAV_Folder extends Sabre_DAV_Directory {
	private $env;
	private $folder;

	function __construct($env, $folder) {
		$this->env = $env;
		$this->folder = $folder;
	}

	public function getChildren() {
		$children = array();
		foreach ($this->env->filesystem()->items($this->folder) as $i) {
			$children[] = $this->createItem($i);
		}

		return $children;
	}

	private function createItem($item) {
		if ($item->isFile()) {
			return new kloudspeaker_DAV_File($this->env, $item);
		}

		return new kloudspeaker_DAV_Folder($this->env, $item);
	}

	public function createFile($name, $data = null) {
		if ($data != NULL) {
			checkUploadSize();
		}
		$size = ($data != NULL and isset($_SERVER['CONTENT_LENGTH'])) ? $_SERVER['CONTENT_LENGTH'] : 0;

		try {
			$file = $this->env->filesystem()->createFile($this->folder, $name, $data, $size);
		} catch (Exception $e) {
			Logging::logException($e);
			throw new Sabre_DAV_Exception_Forbidden();
		}

		return $file;
	}

	public function createDirectory($name) {
		try {
			return $this->env->filesystem()->createFolder($this->folder, $name);
		} catch (Exception $e) {
			Logging::logException($e);
			throw new Sabre_DAV_Exception_Forbidden();
		}
	}

	public function delete() {
		$this->env->filesystem()->delete($this->folder);
	}

	public function getName() {
		return $this->folder->name();
	}

	public function setName($name) {
		$this->env->filesystem()->rename($this->folder, $name);
	}

	public function getLastModified() {
		return $this->folder->lastModified();
	}
}

class kloudspeaker_DAV_File extends Sabre_DAV_File {
	private $env;
	private $file;

	function __construct($env, $file) {
		$this->env = $env;
		$this->file = $file;
	}

	public function getName() {
		return $this->file->name();
	}

	public function setName($name) {
		$this->env->filesystem()->rename($this->file, $name);
	}

	public function get() {
		return $this->env->filesystem()->read($this->file);
	}

	public function put($data) {
		if ($data == NULL) {
			Logging::logDebug("Ignoring empty update");
			return;
		}
		checkUploadSize();

		$oldSize = ($this->file->exists() ? $this->file->size() : NULL);
		$size = (isset($_SERVER['CONTENT_LENGTH'])) ? $_SERVER['CONTENT_LENGTH'] : NULL;
		Logging::logDebug("Update " . $size);
		if ($size == 0) {
			Logging::logDebug("Ignoring empty update");
			return;
		}

		try {
			$this->env->filesystem()->updateFileContents($this->file, $data, $size);
		} catch (Exception $e) {
			Logging::logException($e);
			if ($oldSize != 0 and $this->env->request()->isWindowsClient()) {
				// windows tries to clean up interrupted overwrite
				// for existing files this is not acceptable, ignore later delete request
				Logging::logDebug("File update failed, marking delete ignore");
				$this->env->session()->setValue("ignore_delete_" . $this->file->id(), "" . time());
			}
			throw new Sabre_DAV_Exception_Forbidden();
		}
	}

	public function delete() {
		if ($this->env->request()->isWindowsClient()) {
			$ignoreKey = "ignore_delete_" . $this->file->id();
			$v = $this->env->session()->getValue($ignoreKey);
			if ($v != NULL) {
				$diff = time() - intval($v);
				Logging::logDebug("Delete ignore: " . $v . " diff=" . $diff);
				if ($diff < 60) {
					Logging::logDebug("Item marked ignore for delete, skipping");
					$this->env->session()->removeValue($ignoreKey);
					return;
				}
			}
		}
		if ($this->file->exists()) {
			$this->env->filesystem()->delete($this->file);
		}
	}

	public function getSize() {
		return $this->file->size();
	}

	public function getLastModified() {
		return $this->file->lastModified();
	}

	public function getETag() {
		return null;
	}
}

class kloudspeaker_DAV_Server extends Sabre_DAV_Server {
	public function exec() {
		Logging::logDebug("WebDAV request: " . Util::array2str($this->httpRequest->getHeaders()));
		parent::exec();
	}
}

try {
	$settings = new Settings($CONFIGURATION);
	$db = getDB($settings);
	$conf = new ConfigurationDao($db);
	$session = new WebDavSession();

	$env = new ServiceEnvironment($db, $session, new VoidResponseHandler(), $conf, $settings);
	$env->plugins()->setup();
	$rq = new kloudspeaker_DAV_Request();
	$env->initialize($rq);

	if (isset($BASIC_AUTH) and $BASIC_AUTH == TRUE) {
		$auth = new Sabre_HTTP_BasicAuth();
		$result = $auth->getUserPass();

		if (!$result) {
			Logging::logDebug("DAV authentication missing");
			$auth->requireLogin();
			echo "Authentication required\n";
			die();
		}

		$user = $env->configuration()->getUserByNameOrEmail($result[0]);
		if (!$user) {
			Logging::logDebug("DAV authentication failure");
			$auth->requireLogin();
			echo "Authentication required\n";
			die();
		}

		$userAuth = $env->configuration()->getUserAuth($user["id"]);
		if (!$env->passwordHash()->isEqual($result[1], $userAuth["hash"], $userAuth["salt"])) {
			Logging::logDebug("DAV authentication failure");
			$auth->requireLogin();
			echo "Authentication required\n";
			die();
		}
		$env->authentication()->setAuth($user, "pw");
	} else {
		$auth = new Sabre_HTTP_DigestAuth();
		$auth->setRealm($env->authentication()->realm());
		$auth->init();
		$username = $auth->getUserName();

		if (!$username) {
			Logging::logDebug("DAV digest authentication missing");
			$auth->requireLogin();
			echo "Authentication required\n";
			die();
		}

		$user = $env->configuration()->getUserByNameOrEmail($username);
		if (!$user) {
			Logging::logDebug("DAV digest authentication failure");
			$auth->requireLogin();
			echo "Authentication required\n";
			die();
		}

		$userAuth = $env->configuration()->getUserAuth($user["id"]);

		if (!$auth->validateA1($userAuth["a1hash"])) {
			Logging::logDebug("DAV digest authentication failure");
			$auth->requireLogin();
			echo "Authentication required\n";
			die();
		}
		$env->authentication()->setAuth($user, "pw");
	}

	$session->init($user);

	$dav = new kloudspeaker_DAV_Server(new kloudspeaker_DAV_Root($env));
	$rq->init($dav->httpRequest);

	$dav->setBaseUri($BASE_URI);
	if ($ENABLE_LOCKING) {
		$dav->addPlugin(new Sabre_DAV_Locks_Plugin(new Sabre_DAV_Locks_Backend_FS('data')));
	}

	if ($ENABLE_BROWSER) {
		$dav->addPlugin(new Sabre_DAV_Browser_Plugin());
	}

	if ($ENABLE_TEMPORARY_FILE_FILTER) {
		$dav->addPlugin(new Sabre_DAV_TemporaryFileFilterPlugin('temp'));
	}

	$dav->addPlugin(new Sabre_DAV_Mount_Plugin());
	$dav->exec();
} catch (Exception $e) {
	Logging::logException($e);
	throw new Sabre_DAV_Exception_BadRequest();
}

function getDB($settings) {
	require_once "db/DBConnectionFactory.class.php";
	$f = new DBConnectionFactory();
	return $f->createConnection($settings);
}
?>