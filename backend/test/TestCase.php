<?php

require_once "PHPUnit/Extensions/Database/TestCase.php";

abstract class Kloudspeaker_TestCase extends PHPUnit_Extensions_Database_TestCase {
	static private $CONFIGURATION = array(
		"debug" => TRUE,
		"timezone" => "Europe/Helsinki"
	);
	
    // only instantiate pdo once for test clean-up/fixture load
    static private $pdo = null;

    // only instantiate PHPUnit_Extensions_Database_DB_IDatabaseConnection once per test
    private $conn = null;
    
    static private $init = FALSE;
    protected $responseHandler = null;

    final public function getConnection() {
    	if (!self::$init) {
		    set_include_path(dirname(__FILE__).'/..'.PATH_SEPARATOR.get_include_path());
			require_once("include/KloudspeakerBackend.class.php");
			require_once("include/Settings.class.php");
			require_once("include/Logging.class.php");
			require_once("include/Request.class.php");
			require_once("db/pdo/PDODatabase.class.php");
			self::$init = TRUE;
		}

        if ($this->conn === null) {
            if (self::$pdo == null) {
                self::$pdo = new PDO('sqlite::memory:');
                self::$pdo->exec(file_get_contents(dirname(__FILE__).'/../db/sqlite/sql/install/create_tables.sql'));
                self::$pdo->exec(file_get_contents(dirname(__FILE__).'/../db/sqlite/sql/install/params.sql'));
            }
            $this->conn = $this->createDefaultDBConnection(self::$pdo, ':memory:');
        }

        return $this->conn;
    }
    
    protected function getBackend() {
    	Logging::initialize(self::$CONFIGURATION, "Test");
		$this->responseHandler = new TestResponseHandler();
		$db = PDODatabase::createFromObj(self::$pdo, "sqlite");
		$settings = new Settings(self::$CONFIGURATION);
		$backend = new KloudspeakerBackend($settings, $db, $this->responseHandler);
		//$backend->processRequest(new Request());
		return $backend;
    }
    
    protected function processRequest($method, $url, $params = array(), $data = NULL) {
	    $b = $this->getBackend();
	    $parts = strlen($url) > 0 ? explode("/", $url) : array();
	    $r = new Request(NULL, strtolower($method), $url, "test-ip", $parts, $params, $data);
	    $b->processRequest($r);
	    
	    return $this->responseHandler->lastSuccess;
    }
    
	public function getDataSet() {
		return $this->createXMLDataSet(dirname(__FILE__).'/db.xml');
	}
	
	protected function assertEqualArrayValues($a1, $a2) {
		foreach(array_keys($a1) as $k) {
			$this->assertTrue(isset($a2[$k]));
			$v1 = $a1[$k];
			$this->assertEquals($v1, $a2[$k]);
		}
	}
}

class TestResponseHandler {
	public $lastSuccess = FALSE;
	public $lastErrorType = FALSE;
	
	public function addListener($l) {}
	
	public function download($filename, $type, $mobile, $stream, $size = NULL, $range = NULL) {
		//TODO
	}

	public function sendFile($file, $name, $type, $mobile, $size = NULL) {
		//TODO
	}

	public function send($filename, $type, $stream, $size = NULL) {
		//TODO
	}
	
	public function html($html) {
		//TODO
	}
	
	public function success($data) {
		$this->lastSuccess = $data;
	}

	public function error($type, $details, $data = NULL) {
		$this->lastErrorType = $type;
	}
}
?>