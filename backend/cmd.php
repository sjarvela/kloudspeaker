#!/usr/bin/php
<?php

echo "Kloudspeaker CMD\n";

$inc = dirname(__FILE__) . "/.";
set_include_path($inc . PATH_SEPARATOR . get_include_path());

if (!include "configuration.php") {
	echo "No configuration found\n";
	exit(0);
}
global $CONFIGURATION;
if (!isset($CONFIGURATION)) {
	echo "No configuration found\n";
	exit(0);
}

require_once "include/Settings.class.php";
require_once "include/session/Session.class.php";
require_once "include/ServiceEnvironment.class.php";
require_once "include/Util.class.php";
require_once "db/DBConnectionFactory.class.php";
require_once "include/configuration/ConfigurationDao.class.php";
require_once "include/Logging.class.php";
require_once "include/Version.info.php";
require_once "include/Cookie.class.php";
require_once "include/Features.class.php";
require_once "include/Request.class.php";

Logging::initialize($CONFIGURATION);

$opts = getOpts($argv);
if (count($opts["commands"]) === 0) {
	echo "No options specified\n";
	exit(0);
}

class CMDSession extends Session {
	public function __construct() {
		parent::__construct(FALSE); // don't use cookies
	}

	protected function getDao() {
		return $this;
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

$settings = new Settings($CONFIGURATION);
$session = new CMDSession();

$f = new DBConnectionFactory();
$db = $f->createConnection($settings);
$configuration = new ConfigurationDao($db);

$env = new ServiceEnvironment($db, $session, new VoidResponseHandler(), $configuration, $settings);
$env->initialize(Request::get(TRUE));
$env->plugins()->setup();

$options = $opts["options"];
if (isset($options["user"])) {
	//TODO validate & auth
	$user = $env->configuration()->getUser($options["user"]);
	if (!$user) {
		echo "Invalid user: ".$options["user"]."\n";
		return;
	}
	echo "Running as user: id=".$user["id"]." name=".$user["name"]."\n";
	$env->authentication()->setAuth($user);
}

$command = $opts["commands"][0];
if (!$env->commands()->exists($command)) {
	echo "Invalid command: " . $command. "\n";
	return;
}

echo "Command [" . $command . "]\n";

//TODO allow command registrations from plugins etc
try {
	$env->commands()->execute($command, $options);
} catch (ServiceException $e) {
	Logging::logException($e);
	echo "ERROR: ".$e->type()." ".$e->details()." (".Util::array2str($e->data()).")\n";
} catch (Exception $e) {
	Logging::logException($e);
	echo "ERROR: ".$e->getMessage()."\n";
}

// TOOLS

function getOpts($args) {
	array_shift($args);
	$endofoptions = false;

	$ret = array(
		'commands' => array(),
		'options' => array(),
		'flags' => array(),
		'arguments' => array(),
	);

	while ($arg = array_shift($args)) {
		// if we have reached end of options,
		//we cast all remaining argvs as arguments
		if ($endofoptions) {
			$ret['arguments'][] = $arg;
			continue;
		}

		// Is it a command? (prefixed with --)
		if (substr($arg, 0, 2) === '--') {
			// is it the end of options flag?
			if (!isset($arg[3])) {
				$endofoptions = true; // end of options;
				continue;
			}

			$value = "";
			$com = substr($arg, 2);

			// is it the syntax '--option=argument'?
			if (strpos($com, '=')) {
				list($com, $value) = explode("=", $com, 2);
			}

			// is the option not followed by another option but by arguments
			elseif (strpos($args[0], '-') !== 0) {
				while (strpos($args[0], '-') !== 0) {
					$value .= array_shift($args) . ' ';
				}

				$value = rtrim($value, ' ');
			}

			$ret['options'][$com] = !empty($value) ? $value : true;
			continue;
		}

		// Is it a flag or a serial of flags? (prefixed with -)
		if (substr($arg, 0, 1) === '-') {
			for ($i = 1;isset($arg[$i]); $i++) {
				$ret['flags'][] = $arg[$i];
			}

			continue;
		}

		// finally, it is not option, nor flag, nor argument
		$ret['commands'][] = $arg;
		continue;
	}

	/*if (!count($ret['options']) && !count($ret['flags'])) {
		$ret['arguments'] = array_merge($ret['commands'], $ret['arguments']);
		$ret['commands'] = array();
	}*/
	Logging::logDebug("=>" . Util::array2str($ret));
	return $ret;
}

class VoidResponseHandler {
	public function addListener($l) {}
}

exit(0)
?>