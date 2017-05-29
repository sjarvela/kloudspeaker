<?php
namespace Kloudspeaker\Database;

class Database {
	const TYPE_STRING = \PDO::PARAM_STR;
	const TYPE_INT = \PDO::PARAM_INT;
	const TYPE_BOOL = \PDO::PARAM_BOOL;
	const TYPE_DATETIME = "datetime";
	const TYPE_DATETIME_INTERNAL = "datetime_internal";

	private $tablePrefix = ""; //TODO
	private $transaction = FALSE;

	public function __construct($db, $logger) {
		$this->logger = $logger;
		$this->db = $db;
	}

	public function tableExists($table) {
		try {
			$result = $this->db->query("SELECT 1 FROM $table LIMIT 1");
		} catch (Exception $e) {
			return FALSE;
		}
		return $result !== FALSE;
	}

	public function startTransaction() {
		$this->db->beginTransaction();
		$this->transaction = TRUE;
	}

	public function commit() {
		$this->db->commit();
		$this->transaction = FALSE;
	}

	public function rollback() {
		$this->db->rollback();
		$this->transaction = FALSE;
	}

	public function isTransaction() {
		return $this->transaction;
	}

	public function select($from, array $columns = array('*')) {
		return new SelectStatementBuilder($this->logger, $this->db, $from, $columns);
	}

	public function insert($into, array $set1, array $set2 = NULL) {
		return new InsertStatementBuilder($this->logger, $this->db, $into, $set1, $set2);
	}

	public function update($table, array $values) {
		return new UpdateStatementBuilder($this->logger, $this->db, $table, $values);
	}

	public function delete($from) {
		return new DeleteStatementBuilder($this->logger, $this->db, $from);
	}

	public function script($s) {
		if ($s == NULL) {
			return;
		}

		$sql = str_replace('{TABLE_PREFIX}', (isset($this->tablePrefix) and $this->tablePrefix != '') ? $this->tablePrefix : '', $s);

		$this->logger->debug("DB script", ["script" => $sql]);
		$result = $this->db->query($sql);
		if (!$result) {
			$this->logger->error("DB SCRIPT FAILED: " . implode(" ", $this->db->errorInfo()));
			throw new DatabaseException("Error executing db script");
		}
		return TRUE;
	}

	public function query($q) {
		$this->logger->debug("DB query", ["query" => $q]);
		$result = $this->db->query($q);

		if (!$result) {
			$this->logger->error("DB QUERY FAILED:" . $q . " " . implode(" ", $this->db->errorInfo()));
			throw new DatabaseException("Error executing db query");
		}
		return new SelectResult($result);
	}

	public function db() {
		return $this->db;
	}

	public function lastId() {
		return $this->db->lastInsertId();
	}
}

class SelectStatementBuilder extends WhereStatementBuilder {
	public function __construct($logger, $db, $from, $cols) {
		parent::__construct($db, $logger);
		$this->cols = $cols;
		$this->joins = [];
		$this->from = $from;
		$this->orderBy = NULL;
		$this->parent = NULL;
	}

	public function from($from, $cols) {
		$this->from = $from;
		$this->cols = $cols;
		return $this;
	}

	public function leftJoin($table, $join) {
		$this->joins[] = 'LEFT OUTER JOIN ' . $table . " on " . $join;
		return $this;
	}

	public function orderBy($o) {
		$this->orderBy = $o;
		return $this;
	}

	public function build(&$bound) {
		$q = "SELECT " . implode(", ", $this->cols) . " FROM " . $this->from;
		if (count($this->joins) > 0) {
			$q .= " " . implode(" ", $this->joins);
		}

		$q .= $this->buildWhere($bound);

		if ($this->orderBy != NULL) {
			$q .= ' ORDER BY ' . $this->orderBy;
		}

		return $q;
	}

	public function execute($values = NULL) {
		return new SelectResult($this->doExecute($values), $this->types);
	}

	public function done() {
		return $this->parent;
	}

	public function parent($p = NULL) {
		if ($p != NULL) {
			$this->parent = $p;
			return $this;
		}
		return $this->parent;
	}

	public function toString() {
		return $this->build();
	}
}

class InsertStatementBuilder extends BoundStatementBuilder {
	public function __construct($logger, $db, $into, array $set1, array $set2 = NULL) {
		$this->logger = $logger;
		$this->db = $db;
		$this->into = $into;

		if ($set2 == NULL) {
			if (!\Kloudspeaker\Utils::isAssocArray($set1)) {
				// set1 is regular array -> cols
				$this->cols = $set1;
				$this->values = [];
			} else {
				// set1 is associative array -> value list
				$cols = [];
				foreach ($set1 as $key => $value) {
					$cols[] = $key;
				}
				$this->cols = $cols;
				$this->values = [$set1];
			}
		} else {
			// set1 is cols, set2 is values
			$this->cols = $set1;

			if (\Kloudspeaker\Utils::isAssocArray($set1)) {
				throw new DatabaseException("Invalid query, set1 must be column list");
			}

			if (\Kloudspeaker\Utils::isAssocArray($set2)) {
				// if set2 is associative array, single value set
				$this->values = [$set2];
			} else {
				// if set2 is regular array, each object in list assumed to be value set
				foreach ($set2 as $i) {
					if (!\Kloudspeaker\Utils::isAssocArray($i)) {
						throw new DatabaseException("Invalid query, set2 values must be associative arrays");
					}

				}
				$this->values = $set2;
			}
		}
	}

	public function values($values) {
		if (\Kloudspeaker\Utils::isAssocArray($values)) {
			// if values is associative array, single value set
			$this->values[] = $values;
		} else {
			// if values is regular array, each object in list assumed to be value set
			$this->values = array_merge($this->values, $values);
		}
		return $this;
	}

	public function build($count) {
		$set = "(" . \Kloudspeaker\Utils::strList('?', count($this->cols), ', ') . ")";

		return "INSERT INTO " . $this->into . " (" . implode(", ", $this->cols) . ") VALUES " . \Kloudspeaker\Utils::strList($set, $count, ", ");
	}

	public function execute($values = NULL) {
		if ($values) {
			$this->values($values);
		}

		$v = $this->values;
		if (!$v or count($v) === 0) {
			throw new DatabaseException("Invalid query, missing values");
		}

		$q = $this->build(count($v));

		$this->logger->debug("DB insert", ["query" => $q, "cols" => $this->cols, "values" => $v]);
		$stmt = $this->db->prepare($q);

		$field = 1;
		foreach ($v as $row) {
			foreach ($this->cols as $col) {
				//$this->logger->debug("DB bind", ["col" => $col, "row" => $row, "field" => $field]);
				$this->bindTypedValue($stmt, $field, $col, $row[$col]);

				$field = $field + 1;
			}
		}
		$result = $stmt->execute();
		if (!$result) {
			$this->logger->error("DB QUERY FAILED: " . $q . " " . \Kloudspeaker\Utils::array2str($this->db->errorInfo()));
			throw new DatabaseException("Error executing db query");
		}
		return $stmt->rowCount();
	}

	public function toString() {
		return $this->build();
	}
}

class UpdateStatementBuilder extends WhereStatementBuilder {
	public function __construct($logger, $db, $table, $values) {
		parent::__construct($db, $logger);
		$this->table = $table;
		$this->updateValues = $values;
	}

	public function build(&$bound) {
		$q = "UPDATE " . $this->table . " SET ";
		$i = 1;
		$c = count($this->updateValues);
		foreach ($this->updateValues as $key => $value) {
			$fk = $this->addFieldValue($key, $value);
			$bound[] = ["field" => $key, "key" => $fk];
			$q .= $key . " = ?" . ($i === $c ? "" : ", ");
			$i = $i + 1;
		}
		$q .= $this->buildWhere($bound);
		return $q;
	}

	public function execute($values = NULL) {
		$this->doExecute($values);
		return TRUE; //TODO affected count
	}

	public function toString() {
		return $this->build();
	}
}

class DeleteStatementBuilder extends WhereStatementBuilder {
	public function __construct($logger, $db, $from) {
		parent::__construct($db, $logger);
		$this->from = $from;
	}

	public function build(&$bound) {
		return "DELETE FROM " . $this->from . $this->buildWhere($bound);
	}

	public function execute($values = NULL) {
		$result = $this->doExecute($values);
		return $result->rowCount();
	}

	public function toString() {
		return $this->build();
	}
}

interface IWhereItem {
	function parent();

	function build(&$bound, $first = FALSE);
}

class WhereGroup implements IWhereItem {
	public function __construct($parent, $and = TRUE, $child = NULL) {
		$this->parent = $parent;
		$this->and = $and;
		$this->children = [];
		if ($child) {
			$this->children[] = $child;
		}

	}

	public function parent() {
		return $this->parent;
	}

	public function add($field, $operator, $and, $valKey) {
		$this->children[] = new WhereItem($this, $field, $operator, $and, $valKey);
	}

	public function addItem($item) {
		$this->children[] = $item;
	}

	public function isEmpty() {
		return count($this->children) === 0;
	}

	public function build(&$bound, $first = FALSE) {
		if ($this->isEmpty()) {
			return "";
		}

		$q = ($first ? "" : ($this->and ? " AND " : " OR ")) . "(";
		$first = TRUE;
		foreach ($this->children as $child) {
			$q .= $child->build($bound, $first);
			$first = FALSE;
		}
		return $q . ")";
	}
}

class WhereItem implements IWhereItem {
	public function __construct($parent, $field, $operator = "=", $and = TRUE, $valKey) {
		$this->parent = $parent;
		$this->field = $field;
		$this->and = $and;
		$this->operator = $operator;
		$this->valKey = $valKey;
	}

	public function parent() {
		return $this->parent;
	}

	public function build(&$bound, $first = FALSE) {
		if ($this->operator === "isnull") {
			$op = "is null";
		} else if ($this->operator === "in") {
			if (!is_array($this->valKey)) {
				throw new DatabaseException("Invalid query, key not list");
			}

			$op = "in (" . \Kloudspeaker\Utils::strList('?', count($this->valKey), ', ') . ")";
			foreach ($this->valKey as $key) {
				$bound[] = ["field" => $this->field, "key" => $key];
			}
		} else {
			$op = $this->operator . " ?";
			$bound[] = ["field" => $this->field, "key" => $this->valKey];
			//TODO validate operator =<>
		}

		return ($first ? "" : ($this->and ? " AND " : " OR ")) . $this->field . " " . $op;
	}
}

class WhereInSelect implements IWhereItem {
	public function __construct($stmt, $field, $and = TRUE, $selectBuilder) {
		$this->stmt = $stmt;
		$this->field = $field;
		$this->and = $and;
		$this->innerSelectBuilder = $selectBuilder;
	}

	public function parent() {
		return $this->stmt;
	}

	public function build(&$bound, $first = FALSE) {
		// merge bound values from inner select
		$this->stmt->values($this->innerSelectBuilder->values());

		$op = "in (" . $this->innerSelectBuilder->build($bound) . ")";
		return ($first ? "" : ($this->and ? " AND " : " OR ")) . $this->field . " " . $op;
	}
}

abstract class BoundStatementBuilder {
	protected $types = [];

	public function types($types) {
		$this->types = $types;
		return $this;
	}

	protected function bindTypedValue($stmt, $p, $field, $val) {
		$type = Database::TYPE_STRING;
		if (array_key_exists($field, $this->types)) {
			$type = $this->types[$field];
		}

		$v = $val;
		if ($type === Database::TYPE_DATETIME) {
			$type = Database::TYPE_STRING;
			$v = date("Y-m-d H:i:s", $val);
		} else if ($type === Database::TYPE_DATETIME_INTERNAL) {
			$type = Database::TYPE_INT;
			$v = $val != NULL ? intval(date("YmdHis", $val)) : NULL;
		}
		//TODO validate value type

		$stmt->bindValue($p, $v, $type);
	}
}

abstract class WhereStatementBuilder extends BoundStatementBuilder {
	const VALUE_UNDEFINED = "__undefined__";

	public function __construct($db, $logger) {
		$this->db = $db;
		$this->logger = $logger;
		$this->where = [];
		$this->values = [];
		$this->keyPrefix = "";
	}

	public function keyPrefix($p) {
		$this->keyPrefix = $p . "_";
		return $this;
	}

	public function values($v = NULL) {
		if ($v != NULL) {
			$this->values = array_merge($this->values, $v);
		}

		return $this->values;
	}

	public function addFieldValues($field, array $values) {
		$keys = [];
		foreach ($values as $val) {
			$key = $this->keyPrefix . $field . ':' . count($this->values);
			$this->values[$key] = $val;
			$keys[] = $key;
		}
		return $keys;
	}

	public function addFieldValue($field, $val) {
		$key = ($val !== WhereStatementBuilder::VALUE_UNDEFINED ? $this->keyPrefix . $field . ':' . count($this->values) : $this->keyPrefix . $field);
		if ($val !== WhereStatementBuilder::VALUE_UNDEFINED) {
			$this->values[$key] = $val;
		}

		return $key;
	}

	public function where($field, $val = "__undefined__", $operator = "=", $and = TRUE) {
		$g = new WhereGroup(NULL, $and);
		$g->add($field, $operator, $and, $this->addFieldValue($field, $val));
		$this->where[] = $g;
		return new WhereGroupBuilder($this, $g);
	}

	public function whereIn($field, array $values, $and = TRUE) {
		$g = new WhereGroup(NULL, $and);
		$g->add($field, "in", $and, $this->addFieldValues($field, $values));
		$this->where[] = $g;
		return new WhereGroupBuilder($this, $g);
	}

	public function whereInSelect($field, $table, $col = NULL, $and = TRUE) {
		$g = new WhereGroup(NULL, $and);
		$wgb = new WhereGroupBuilder($this, $g);

		$s = new SelectStatementBuilder($this->logger, NULL, $table, ($col != NULL ? [$col] : NULL));
		$s->parent($wgb)->keyPrefix("ins" . count($this->values));

		$this->where[] = new WhereInSelect($this, $field, $and, $s);
		return $s;
	}

    public function createSelectBuilder($table, $cols) {
        return new SelectStatementBuilder($this->logger, NULL, $table, $cols);
    }

	protected function buildWhere(&$bound) {
		if (count($this->where) === 0) {
			return "";
		}

		$r = " WHERE ";
		$first = TRUE;
		foreach ($this->where as $item) {
			$r .= $item->build($bound, $first);
			$first = FALSE;
		}
		return $r;
	}

	abstract function build(&$bound);

	protected function doExecute($values = NULL) {
		$bound = [];
		$q = $this->build($bound);
		$result = FALSE;

		if (count($bound) > 0) {
			$v = $this->values;
			if ($values) {
				$v = array_merge($v, $values);
			}

			$stmt = $this->db->prepare($q);
			$i = 1;
			foreach ($bound as $b) {
				$this->bindTypedValue($stmt, $i, $b["field"], $v[$b["key"]]);
				$i = $i + 1;
			}

			$this->logger->debug("DB prepared statement:", ["query" => $q, "bound" => $bound, "values" => $v, "types" => $this->types]);

			$result = $stmt;
			if (!$stmt->execute()) {
				$result = FALSE;
			}

		} else {
			$this->logger->debug("DB query", ["query" => $q]);
			$result = $this->db->query($q);
		}

		if (!$result) {
			$this->logger->error("DB QUERY FAILED:" . $q . " " . implode(" ", $this->db->errorInfo()));
			throw new DatabaseException("Error executing db query");
		}
		return $result;
	}
}

class WhereGroupBuilder {
	public function __construct($stmt, $group) {
		$this->stmt = $stmt;
		$this->group = $group;
	}

	public function  and ($field, $val = "__undefined__", $operator = "=") {
		$this->group->add($field, $operator, TRUE, $this->stmt->addFieldValue($field, $val));
		return $this;
	}

	public function  or ($field, $val = "__undefined__", $operator = "=") {
		$this->group->add($field, $operator, FALSE, $this->stmt->addFieldValue($field, $val));
		return $this;
	}

	public function andIn($field, array $values) {
		$this->group->add($field, "in", TRUE, $this->stmt->addFieldValues($field, $values));
		return $this;
	}

    public function andInSelect($field, $table, $col = NULL) {
        $s = $this->stmt->createSelectBuilder($table, ($col != NULL ? [$col] : NULL));
        /*$g = new WhereGroup(NULL, $and);
        $wgb = new WhereGroupBuilder($this, $g);

        $s = new SelectStatementBuilder($this->logger, NULL, $table, ($col != NULL ? [$col] : NULL));
        $s->parent($wgb)->keyPrefix("ins" . count($this->values));

        $this->where[] = new WhereInSelect($this, $field, $and, $s);*/
        $this->group->add($field, ["in", $s], TRUE);
        return $s;
    }

	public function orIn($field, array $values) {
		$this->group->add($field, "in", FALSE, $this->stmt->addFieldValues($field, $values));
		return $this;
	}

	public function andIsNull($field) {
		$this->group->add($field, "isnull", TRUE, NULL);
		return $this;
	}

	public function orIsNull($field) {
		$this->group->add($field, "isnull", FALSE, NULL);
		return $this;
	}

	public function parent() {
		$p = $this->group->parent();
		if ($p == NULL) {
			return new WhereGroupBuilder($this->stmt, NULL);
		}

		return new WhereGroupBuilder($this->stmt, $p);
	}

	public function andWhere($field, $val = "__undefined__", $operator = "=") {
		$p = $this->group->parent();
		if ($p == NULL) {
			return $this->stmt->where($field, $val, $operator, TRUE, $this->stmt->addFieldValue($field, $val));
		};
		$g = new WhereGroup($p);
		$p->add($g);
		return new WhereGroupBuilder($this->stmt, $g);
	}

	public function orWhere($field, $val = "__undefined__", $operator = "=") {
		$p = $this->group->parent();
		if ($p == NULL) {
			return $this->stmt->where($field, $val, $operator, FALSE, $this->stmt->addFieldValue($field, $val));
		};
		$g = new WhereGroup($p, FALSE);
		$p->add($g);
		return new WhereGroupBuilder($this->stmt, $g);
	}

	public function andGroup($field, $val = "__undefined__", $operator = "=") {
		$g = new WhereGroup($this->group);
		$this->group->addItem($g);
		$g->add($field, $operator, TRUE, $this->stmt->addFieldValue($field, $val));
		return new WhereGroupBuilder($this->stmt, $g);
	}

	public function orGroup($field, $val = "__undefined__", $operator = "=") {
		$g = new WhereGroup($this->group, FALSE);
		$this->group->addItem($g);
		$g->add($field, $operator, FALSE, $this->stmt->addFieldValue($field, $val));
		return new WhereGroupBuilder($this->stmt, $g);
	}

	public function done() {
		return $this->stmt;
	}

	public function execute($values = NULL) {
		return $this->done()->execute($values);
	}
}

class UpdateResult {
	public function __construct($result) {
		$this->result = $result;
	}

	public function affected() {
		return $this->result->rowCount();
	}
}

class SelectResult {
	private $result;
	private $rows = NULL;

	public function __construct($result, $types = NULL) {
		$this->result = $result;
		$this->types = $types;
	}

	public function count() {
		$rows = $this->getRows();
		if (!$rows) {
			return 0;
		}

		return count($rows);
	}

	public function affected() {
		return $this->result->rowCount();
	}

	private function getRows() {
		if ($this->rows != NULL) {
			return $this->rows;
		}

		$rows = $this->result->fetchAll(\PDO::FETCH_BOTH);
		$this->rows = [];
		if ($this->types and count($this->types) > 0) {
			foreach ($rows as $row) {
				foreach ($this->types as $field => $type) {
					//TODO optimize field loop
					if (!array_key_exists($field, $row)) {
						continue;
					}

					if ($type === Database::TYPE_DATETIME) {
						$row[$field] = $row[$field] != NULL ? strtotime($row[$field]) : NULL;
					} else if ($type === Database::TYPE_DATETIME_INTERNAL) {
						$val = $row[$field];
						if ($val != NULL) {
							$str = "" . $val;

							$str = sprintf("%s-%s-%s %s:%s:%s", substr($val, 0, 4), substr($val, 4, 2), substr($val, 6, 2), substr($val, 8, 2), substr($val, 10, 2), substr($val, 12, 2));
							$val = strtotime($str);
						}
						$row[$field] = $val;
					}
				}
				$this->rows[] = $row;
			}
		} else {
			$this->rows = $rows;
		}
		return $this->rows;
	}

	public function rows() {
		return $this->getRows();
	}

	public function values($col) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		$list = array();
		foreach ($rows as $row) {
			$list[] = $row[$col];
		}
		return $list;
	}

	public function map($keyCol, $valueCol = NULL, $valueCol2 = NULL) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		$list = array();
		foreach ($rows as $row) {
			if ($valueCol == NULL) {
				$list[$row[$keyCol]] = $row;
			} else {
				if ($valueCol2) {
					$list[$row[$keyCol]] = array($valueCol => $row[$valueCol], $valueCol2 => $row[$valueCol2]);
				} else {
					$list[$row[$keyCol]] = $row[$valueCol];
				}
			}
		}
		return $list;
	}

	public function listMap($keyCol) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		$list = array();
		foreach ($rows as $row) {
			$key = $row[$keyCol];
			if (!isset($list[$key])) {
				$list[$key] = array();
			}

			$list[$key][] = $row;
		}
		return $list;
	}

	public function firstRow() {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		if (count($rows) == 0) {
			return NULL;
		}

		return $rows[0];
	}

	public function firstValue($val) {
		$ret = $this->firstRow();
		if (!$ret) {
			return NULL;
		}

		return $ret[$val];
	}

	public function value($r = 0, $f = 0) {
		$rows = $this->getRows();
		if (!$rows) {
			return NULL;
		}

		if (count($rows) <= $r) {
			return NULL;
		}

		$row = $rows[$r];
		return $row[$f];
	}

	public function free() {
	}
}

class DatabaseException extends \Kloudspeaker\KloudspeakerException {
	public function __construct($msg) {
		parent::__construct($msg, \Kloudspeaker\Errors::InvalidRequest);
	}
}