<?php

namespace Kloudspeaker;

require_once "tests/Kloudspeaker/TestLogger.php";

require_once "Kloudspeaker/Api.php";
require_once "Kloudspeaker/Database/DB.php";

use \Kloudspeaker\Database\Database as Database;
use PHPUnit\DbUnit\TestCase;

abstract class AbstractPDOTestCase extends TestCase {
    static private $tablesInitialized = FALSE;
    static private $pdo = null;

    private $conn = null;

    //container
    public $logger;
    public $db;

    protected function setUp() {
        parent::setUp();
        $this->initializeDatabase();

        $this->logger = new TestLogger();
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

    private function initializeDatabase() {
        $this->getConnection();

    	$TABLES = ["user", "user_auth", "user_group", "folder", "item_id", "permission", "user_folder", "parameter", "event_log", "session", "session_data", "metadata"];

        if (!self::$tablesInitialized) {
        	foreach ($TABLES as $table) {
        		self::$pdo->exec("DROP TABLE IF EXISTS `$table`;");
        	}
            $script = dirname(__FILE__) . '/../../../backend/db/mysql/sql/install/create_tables.sql';
        	$createSql = file_get_contents($script);
            if (!$createSql) throw new Exception("Script not found ".$script);

        	$createSql = str_replace("{ENGINE}", "InnoDB", str_replace("{TABLE_PREFIX}", "", $createSql));
        	self::$pdo->exec($createSql);
        }

		$ds = $this->getDataSet();
		$this->getDatabaseTester()->setDataSet($ds);
		$this->getDatabaseTester()->onSetUp();
    }
}