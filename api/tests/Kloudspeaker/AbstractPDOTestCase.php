<?php

namespace Kloudspeaker;

require_once "api/tests/Kloudspeaker/TestLogger.php";

require_once "api/Kloudspeaker/Api.php";
require_once "api/Kloudspeaker/Database/DB.php";

use \Kloudspeaker\Database\Database as Database;
use PHPUnit\Framework\TestCase;
use PHPUnit\DbUnit\TestCaseTrait;

abstract class AbstractPDOTestCase extends TestCase {
	use TestCaseTrait;

    static private $pdo = null;

    private $conn = null;

    //container
    public $logger;
    public $db;

    protected function setup() {
        $this->logger = new TestLogger();

        $conn = $this->getConnection();
        $this->setupDB(self::$pdo);
        $this->db = new \Kloudspeaker\Database\Database(self::$pdo, $this->logger);
    }

    final public function getConnection() {
        if ($this->conn === null) {
            if (self::$pdo == null) {
                self::$pdo = new \PDO($GLOBALS['DB_DSN'], $GLOBALS['DB_USER'], $GLOBALS['DB_PASSWD']);
            }
            $this->conn = $this->createDefaultDBConnection(self::$pdo, $GLOBALS['DB_DBNAME']);
        }

        return $this->conn;
    }

    private function setupDB($pdo) {
    	$TABLES = ["user", "user_auth", "user_group", "folder", "item_id", "permission", "user_folder", "parameter", "event_log", "session", "session_data", "metadata"];

    	foreach ($TABLES as $table) {
    		$pdo->exec("DROP TABLE IF EXISTS `$table`;");
    	}
        $script = dirname(__FILE__) . '/../../../backend/db/mysql/sql/install/create_tables.sql';
    	$createSql = file_get_contents($script);
        if (!$createSql) throw new Exception("Script not found ".$script);

    	$createSql = str_replace("{ENGINE}", "InnoDB", str_replace("{TABLE_PREFIX}", "", $createSql));
    	$pdo->exec($createSql);

		$ds = $this->getDataSet();
		$this->getDatabaseTester()->setDataSet($ds);
		$this->getDatabaseTester()->onSetUp();
    }

    abstract function getDataSet();
}
