<?php

namespace Kloudspeaker;

require_once "Kloudspeaker/Api.php";
require_once "Kloudspeaker/Database/DB.php";

require_once "tests/Kloudspeaker/TestLogger.php";

use PHPUnit\Framework\TestCase;
use \Kloudspeaker\Database\Database as Database;

class MockDB {
    public $transaction = FALSE;
    public $commit = FALSE;

    public $query = NULL;
    public $prepare = NULL;

    public function beginTransaction() {
        $this->transaction = TRUE;
    }

    public function commit() {
        $this->commit = TRUE;
    }

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
    public $count = 0;
    public $query;
    public $bind = [];
    public $bindTypes = [];

    public function __construct($sql) {
        $this->query = $sql;
    }

    public function bindValue($key, $val, $type) {
        $this->bind[$key] = $val;
        $this->bindTypes[$key] = $type;
    }

    public function execute() {
        $this->count = $this->count + 1;
        return TRUE;    
    }

    public function rowCount() {
        return 0;    
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

    public function testSelectWhereWithTypeInt() {
        $this->db()->select("foo", ["id", "bar"])->types(["bar" => Database::TYPE_INT])->where("id", "1")->and("bar", 2)->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? AND bar = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals(\PDO::PARAM_STR, $this->mockDB->prepare->bindTypes[1]);
        $this->assertEquals(2, $this->mockDB->prepare->bind[2]);
        $this->assertEquals(\PDO::PARAM_INT, $this->mockDB->prepare->bindTypes[2]);
    }

    public function testSelectWhereWithTypeDatetime() {
        $this->db()->select("foo", ["id", "bar"])->types(["bar" => Database::TYPE_DATETIME])->where("id", "1")->and("bar", strtotime('2016/03/09 23:12:01'))->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? AND bar = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals(\PDO::PARAM_STR, $this->mockDB->prepare->bindTypes[1]);
        $this->assertEquals('2016-03-09 23:12:01', $this->mockDB->prepare->bind[2]);
        $this->assertEquals(\PDO::PARAM_STR, $this->mockDB->prepare->bindTypes[2]);
    }

    public function testSelectLeftJoin() {
        $this->db()->select("foo", ["id", "bar"])->leftJoin('bar', 'foo.id = bar.b_id')->where("id", "1")->execute();
        $this->assertEquals('SELECT id, bar FROM foo LEFT OUTER JOIN bar on foo.id = bar.b_id WHERE (id = ?)', $this->mockDB->prepare->query);
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

    public function testSelectWhereIn() {
        $this->db()->select("foo", ["id", "bar"])->whereIn("id", ["1", "2", "3"])->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id in (?, ?, ?))', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('2', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('3', $this->mockDB->prepare->bind[3]);
    }

    public function testSelectWhereAndIn() {
        $this->db()->select("foo", ["id", "bar"])->where('foo', 'bar')->andIn("id", ["1", "2", "3"])->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (foo = ? AND id in (?, ?, ?))', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('1', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('2', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('3', $this->mockDB->prepare->bind[4]);
    }

    public function testSelectWhereOrIn() {
        $this->db()->select("foo", ["id", "bar"])->where('foo', 'bar')->orIn("id", ["1", "2", "3"])->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (foo = ? OR id in (?, ?, ?))', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('1', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('2', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('3', $this->mockDB->prepare->bind[4]);
    }

    public function testSelectWhereOrNull() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->orIsNull("foo")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? OR foo is null)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
    }

    public function testSelectWhereAndNull() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->andIsNull("foo")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? AND foo is null)', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
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

    public function testSelectInnerAndGroup() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->andGroup("foo", "bar")->or("foo", "baz")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? AND (foo = ? OR foo = ?))', $this->mockDB->prepare->query);
        $this->assertEquals('1', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[3]);
    }

    public function testSelectInnerOrGroup() {
        $this->db()->select("foo", ["id", "bar"])->where("id", "1")->orGroup("foo", "bar")->or("foo", "baz")->execute();
        $this->assertEquals('SELECT id, bar FROM foo WHERE (id = ? OR (foo = ? OR foo = ?))', $this->mockDB->prepare->query);
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

    public function testUpdateWithTypeInt() {
        $this->db()->update("foo", ["foo1" => "bar", "foo2" => 3])->types(["foo2" => Database::TYPE_INT])->where("id", "1")->and("foo2", 2)->execute();
        $this->assertEquals('UPDATE foo SET foo1 = ?, foo2 = ? WHERE (id = ? AND foo2 = ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals(\PDO::PARAM_STR, $this->mockDB->prepare->bindTypes[1]);
        $this->assertEquals(3, $this->mockDB->prepare->bind[2]);
        $this->assertEquals(\PDO::PARAM_INT, $this->mockDB->prepare->bindTypes[2]);
        $this->assertEquals('1', $this->mockDB->prepare->bind[3]);
        $this->assertEquals(\PDO::PARAM_STR, $this->mockDB->prepare->bindTypes[3]);
        $this->assertEquals(2, $this->mockDB->prepare->bind[4]);
        $this->assertEquals(\PDO::PARAM_INT, $this->mockDB->prepare->bindTypes[4]);
    }

    public function testInsert() {
        $this->db()->insert("foo", ["foo1" => "bar", "foo2" => "baz"])->execute();
        $this->assertEquals('INSERT INTO foo (foo1, foo2) VALUES (?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
    }

    public function testInsertMultiple() {
        $this->db()->insert("foo", ["foo1", "foo2"], [["foo1" => "bar", "foo2" => "baz"], ["foo1" => "bar2", "foo2" => "baz2"]])->execute();
        $this->assertEquals('INSERT INTO foo (foo1, foo2) VALUES (?, ?), (?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('bar2', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('baz2', $this->mockDB->prepare->bind[4]);
    }

    public function testInsertAddDynamic() {
        $this->db()->insert("foo", ["foo1", "foo2"], [["foo1" => "bar", "foo2" => "baz"]])->values(["foo1" => "bar2", "foo2" => "baz2"])->execute();
        $this->assertEquals('INSERT INTO foo (foo1, foo2) VALUES (?, ?), (?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('bar2', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('baz2', $this->mockDB->prepare->bind[4]);
    }

    public function testInsertAddMultipleDynamic() {
        $this->db()->insert("foo", ["foo1", "foo2"], [["foo1" => "bar", "foo2" => "baz"]])->values([["foo1" => "bar2", "foo2" => "baz2"], ["foo1" => "bar3", "foo2" => "baz3"]])->execute();
        $this->assertEquals('INSERT INTO foo (foo1, foo2) VALUES (?, ?), (?, ?), (?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('bar2', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('baz2', $this->mockDB->prepare->bind[4]);
        $this->assertEquals('bar3', $this->mockDB->prepare->bind[5]);
        $this->assertEquals('baz3', $this->mockDB->prepare->bind[6]);
    }

    public function testInsertAddMultipleDynamic2() {
        $this->db()->insert("foo", ["foo1", "foo2", "foo3"])->values(["foo1" => "bar", "foo2" => "baz", "foo3" => "bax"])->values(["foo1" => "bar2", "foo2" => "baz2", "foo3" => "bax2"])->execute();
        $this->assertEquals('INSERT INTO foo (foo1, foo2, foo3) VALUES (?, ?, ?), (?, ?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('bax', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('bar2', $this->mockDB->prepare->bind[4]);
        $this->assertEquals('baz2', $this->mockDB->prepare->bind[5]);
        $this->assertEquals('bax2', $this->mockDB->prepare->bind[6]);
    }

    public function testInsertWithExecute() {
        $this->db()->insert("foo", ["foo1", "foo2"])->execute(["foo1" => "bar", "foo2" => "baz"]);
        $this->assertEquals('INSERT INTO foo (foo1, foo2) VALUES (?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
    }

    public function testInsertWithExecuteMultiple() {
        $this->db()->insert("foo", ["foo1", "foo2"])->execute([["foo1" => "bar", "foo2" => "baz"], ["foo1" => "bar2", "foo2" => "baz2"]]);
        $this->assertEquals('INSERT INTO foo (foo1, foo2) VALUES (?, ?), (?, ?)', $this->mockDB->prepare->query);
        $this->assertEquals('bar', $this->mockDB->prepare->bind[1]);
        $this->assertEquals('baz', $this->mockDB->prepare->bind[2]);
        $this->assertEquals('bar2', $this->mockDB->prepare->bind[3]);
        $this->assertEquals('baz2', $this->mockDB->prepare->bind[4]);
    }

    private function db() {
        $this->mockDB = new MockDB();
        $logger = new TestLogger();
        return new \Kloudspeaker\Database\Database($this->mockDB, $logger);
    }
}
