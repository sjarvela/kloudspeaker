<?php

namespace Kloudspeaker;

use PHPUnit\Framework\TestCase;

require "api/Kloudspeaker/Api.php";
require "api/Kloudspeaker/Database/DB.php";
require "api/Kloudspeaker/Utils.php";

class MockDB {
    public $query = NULL;
    public $prepare = NULL;

    public function query($sql) {
        $this->query = $sql;
        return TRUE;
    }

    public function prepare($sql) {
        $this->prepare = new MockStatement($sql);
        return $this->prepare;
    }

    public function errorInfo() {
        return [];
    }
}

class MockStatement {
    public $query;
    public $bind = [];

    public function __construct($sql) {
        $this->query = $sql;
    }

    public function bindValue($key, $val) {
        $this->bind[$key] = $val;
    }

    public function execute() {
        return TRUE;    
    }
}

class DBTest extends TestCase {

    /**
     * @before
     */
    public function setup() {

    }

    public function testSimpleSelect() {
        $this->db()->select("foo", ["id", "bar"])->execute();
        $this->assertEquals('SELECT id, bar FROM foo', $this->mockDB->query);
    }

    public function testSelectWhere() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
    }

    public function testSelectWhereAnd() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->and("foo", "bar")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? AND foo = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[2]);
    }

    public function testSelectWhereOr() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->or("foo", "bar")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? OR foo = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[2]);
    }

    public function testSelectWhereAndBetweenGroups() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->or("foo", "bar")->andWhere("foo", "baz")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? OR foo = ?) AND (foo = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[3]);
    }

    public function testSelectWhereOrBetweenGroups() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->or("foo", "bar")->orWhere("foo", "baz")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? OR foo = ?) OR (foo = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[3]);
    }

    public function testDelete() {
        $this->db()->delete("foo")->where("id", "1")->execute();
        $this->assertEquals('DELETE FROM foo WHERE (id = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
    }

    public function testUpdate() {
        $this->db()->update("foo", ["foo1" => "bar", "foo2" => "baz"])->where("id", "1")->execute();
        $this->assertEquals('UPDATE foo SET foo1 = ?, foo2 = ? WHERE (id = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('1', $this->mockDB->prepare->bind[3]);
    }

    private function db() {
        $this->mockDB = new MockDB();
        $logger = new TestLogger();
        return new \Kloudspeaker\Database\Database($this->mockDB, $logger);
    }
}

class TestLogger {
    public function debug($msg, $o) {
        echo $msg . " " . \Kloudspeaker\Utils::array2str($o) . "\n";
    }
}
