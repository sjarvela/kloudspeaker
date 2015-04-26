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

$settings = new Settings($CONFIGURATION);
$session = new Session(FALSE);

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
echo "Command [" . $command . "]\n";

//TODO allow command registrations from plugins etc
try {
	if (strcasecmp($command, "copy") == 0) {
		processCopy($env, $options);
	} else if (strcasecmp($command, "upload") == 0) {
		processUpload($env, $options);
	} else {
		echo "Invalid command: " . $command. "\n";
	}
} catch (ServiceException $e) {
	Logging::logException($e);
	echo "ERROR: ".$e->type()." ".$e->details()." (".Util::array2str($e->data()).")\n";
} catch (Exception $e) {
	Logging::logException($e);
	echo "ERROR: ".$e->getMessage()."\n";
}

//TODO move actual commands into separate file

function processUpload($env, $opts) {
	$ctx = array(
		"src" => isset($opts["src"]) ? $opts["src"] : NULL,
		"target" => isset($opts["target"]) ? $opts["target"] : NULL,
		"name" => isset($opts["name"]) ? $opts["name"] : NULL
	);

	if (!$ctx["src"]) {
		echo "UPLOAD: src missing\n";
		return;
	}

	//validate target
	if (!$ctx["target"]) {
		echo "UPLOAD: target missing\n";
		return;
	}
	if (!strpos($ctx["target"], ":/") ) {
		echo "UPLOAD: target not right format: \"[FID]:[PATH]/\"\n";
		return;
	}
	if (substr($ctx["target"], -1) != "/") {
		// make sure path is folder path
		$ctx["target"] = $ctx["target"]."/";
	}

	// validate src
	if (!file_exists($ctx["src"]) or !is_file($ctx["src"])) {
		echo "UPLOAD: src does not exist: " . $ctx["src"] . "\n";
		return;
	}
	if (!is_file($ctx["src"])) {
		echo "UPLOAD: src is not a file: " . $ctx["src"] . "\n";
		return;
	}
	echo "UPLOAD: " . Util::array2str($ctx) . "\n";

	$name = basename($ctx["src"]);
	if ($ctx["name"] != NULL) $name = $ctx["name"];

	$target = $env->filesystem()->itemWithLocation($ctx["target"], TRUE);
	if (!$target->exists()) {
		echo "UPLOAD: target folder does not exist: " . $ctx["target"] . "\n";
		return;
	}
	if ($target->isFile()) {
		echo "UPLOAD: target is not a folder: " . $ctx["target"] . "\n";
		return;
	}
	if ($target->fileExists($name)) {
		echo "UPLOAD: target (".$ctx["target"].") already has a file with name \"" . $name . "\"\n";
		return;
	}

	$content = fopen($ctx["src"], "rb");
	if (!$content) {
		echo "UPLOAD: could not read source file: " . $ctx["target"] . "\n";
		return;
	}
	$created = $env->filesystem()->createFile($target, $name, $content);
	fclose($content);

	echo "UPLOAD: file copied successfully into ".$created->internalPath()."\n";
}

function processCopy($env, $opts) {
	$ctx = array(
		"src" => isset($opts["src"]) ? $opts["src"] : NULL,
		"target" => isset($opts["target"]) ? $opts["target"] : NULL,
		"name" => isset($opts["name"]) ? $opts["name"] : NULL
	);

	if (!$ctx["src"]) {
		echo "COPY: src missing\n";
		return;
	}

	//validate target
	if (!$ctx["target"]) {
		echo "COPY: target missing\n";
		return;
	}
	if (!strpos($ctx["target"], ":/") ) {
		echo "COPY: target not right format: \"[FID]:[PATH]/\"\n";
		return;
	}
	if (substr($ctx["target"], -1) != "/") {
		// make sure path is folder path
		$ctx["target"] = $ctx["target"]."/";
	}

	// validate src
	if (!file_exists($ctx["src"]) or !is_file($ctx["src"])) {
		echo "COPY: src does not exist: " . $ctx["src"] . "\n";
		return;
	}
	if (!is_file($ctx["src"])) {
		echo "COPY: src is not a file: " . $ctx["src"] . "\n";
		return;
	}
	echo "COPY: " . Util::array2str($ctx) . "\n";

	$name = basename($ctx["src"]);
	if ($ctx["name"] != NULL) $name = $ctx["name"];

	$target = $env->filesystem()->itemWithLocation($ctx["target"], TRUE);
	if (!$target->exists()) {
		echo "COPY: target folder does not exist: " . $ctx["target"] . "\n";
		return;
	}
	if ($target->isFile()) {
		echo "COPY: target is not a folder: " . $ctx["target"] . "\n";
		return;
	}
	if ($target->fileExists($name)) {
		echo "COPY: target (".$ctx["target"].") already has a file with name \"" . $name . "\"\n";
		return;
	}
	$created = $target->fileWithName($name);

	copy($ctx["src"], $created->internalPath());

	echo "COPY: file copied successfully into ".$created->internalPath()."\n";
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
				list($com, $value) = split("=", $com, 2);
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

	if (!count($ret['options']) && !count($ret['flags'])) {
		$ret['arguments'] = array_merge($ret['commands'], $ret['arguments']);
		$ret['commands'] = array();
	}
	Logging::logDebug("=>" . Util::array2str($ret));
	return $ret;
}

class VoidResponseHandler {
	public function addListener($l) {}
}

exit(0)
?>