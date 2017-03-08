<?php
namespace Kloudspeaker\Database;

interface IDatabase {

}

class Database implements IDatabase {
    public function __construct($db, $logger) {
        $this->logger = $logger;
        $this->db = $db;
    }

    public function startTransaction() {
        $this->db->beginTransaction();
    }

    public function commit() {
        $this->db->commit();
    }

    public function rollback() {
        $this->db->rollback();
    }

    public function select($from, array $columns = array('*')) {
        return new SelectStatementBuilder($this->logger, $this->db, $from, $columns);
    }

    public function insert($into, array $values) {
        return new InsertStatementBuilder($this->logger, $this->db, $into, $values);
    }

    public function update($table, array $values) {
        return new UpdateStatementBuilder($this->logger, $this->db, $table, $values);
    }

    public function delete($from) {
        return new DeleteStatementBuilder($this->logger, $this->db, $from);
    }
}

class SelectStatementBuilder extends WhereStatementBuilder {
    public function __construct($logger, $db, $from, $cols) {
        parent::__construct($logger);
        $this->db = $db;
        $this->cols = $cols;
        $this->joins = [];
        $this->from = $from;
        $this->orderBy = NULL;
    }

    public function leftJoin($table, $join) {
        $this->joins[] = 'LEFT OUTER JOIN '. $table. " on ".$join;
        return $this;
    }

    public function orderBy($o) {
        $this->orderBy = $o;
        return $this;
    }

    public function build(&$bound) {
        $q = "SELECT " . implode(", ", $this->cols) . " FROM " . $this->from;
        if (count($this->joins) > 0)
            $q .= " ".implode(" ", $this->joins);
        
        $q .= $this->buildWhere($bound);

        if ($this->orderBy != NULL)
            $q .= ' ORDER BY '.$this->orderBy;
        return $q;
    }

    public function execute($values = NULL) {        
        return new SelectResult($this->doExecute($values));
    }

    public function toString() {
        return $this->build();
    }
}

class InsertStatementBuilder {
    public function __construct($logger, $db, $into, $values, $values2 = NULL) {
        $this->logger = $logger;
        $this->db = $db;
        $this->into = $into;

        if ($values2 == NULL) {
            if (!\Kloudspeaker\Utils::isAssocArray($values)) {
                $this->cols = $values;
                $this->values = [];
            } else {
                //TODO validate
                $cols = [];
                $vals = [];
                foreach ($values as $key => $value) {
                    $cols[] = $key;
                    $vals[] = $value;
                }
                $this->cols = $cols;
                $this->values = [$vals];
            }
        } else {
            //TODO validate
            $this->cols = $values;
            $this->values = $values2;
        }
    }

    public function values($values) {
        $this->values[] = $values;
    }

    public function build() {
        $q = "INSERT INTO " . $this->into . "(" . implode(", ", $this->cols) . ") VALUES (" . \Kloudspeaker\Utils::strList('?', count($this->cols), ', ') . ")";
        return $q;
    }

    public function execute() {
        if (!$this->values or count($this->values) === 0) throw new DatabaseException("Invalid query, missing values");

        $q = $this->build();
        #$this->logger->debug("DB :".$q, ["cols" => $this->cols, "values" => $this->values]);

        $this->db->beginTransaction();
        $stmt = $this->db->prepare($q);
        foreach ($this->values as $row) {
            $this->logger->debug("INSERT ", $row);

            $field = 1;
            foreach ($this->cols as $col) {
                #$this->logger->debug("BIND ".$field, [$row[$field]]);
                $stmt->bindValue($field, $row[$field-1]);
                $field = $field + 1;
            }
            if (!$stmt->execute()) {
                $this->logger->error("DB QUERY FAILED: ".$q." ".\Kloudspeaker\Utils::array2str($this->db->errorInfo()));
                throw new DatabaseException("Error executing db query");
            }
        }
        $this->db->commit();
        return TRUE;    //TODO affected count
    }

    public function toString() {
        return $this->build();
    }
}

class UpdateStatementBuilder extends WhereStatementBuilder {
    public function __construct($logger, $db, $table, $values) {
        parent::__construct();
        $this->logger = $logger;
        $this->db = $db;
        $this->table = $table;
        $this->values = $values;
    }

    public function build(&$bound) {
        $q = "UPDATE " . $this->table . " SET ";
        $i = 1;
        $c = count($this->values);
        foreach ($this->values as $key => $value) {
            $q .= $key . " = :" . $key . ($i === $c ? " " : ", ");
            $i = $i + 1;
        }
        $q .= $this->buildWhere($bound);
        return $q;
    }

    public function execute($values = NULL) {
        $q = $this->build();

        if ($values) {
            $this->values = array_merge($this->values, $values);
        }

        if (count($this->values) > 0) {
            $this->logger->debug("DB :".$q, $this->values);

            $stmt = $this->db->prepare($q);
            foreach ($this->values as $key => $value) {
                $stmt->bindValue(':'.$key, $value);
            }
            $result = $stmt;
            if (!$stmt->execute())
                $result = FALSE;
        } else {
            $this->logger->debug("DB :".$q);
            $result = $this->db->query($q);
        }
        
        if (!$result) {
            $this->logger->error("DB QUERY FAILED:".$q." ".implode(" ", $this->db->errorInfo()));
            throw new DatabaseException("Error executing db query");
        }
        return TRUE;    //TODO affect count
    }

    public function toString() {
        return $this->build();
    }
}

class DeleteStatementBuilder extends WhereStatementBuilder {
    public function __construct($logger, $db, $from) {
        parent::__construct($logger);
        $this->db = $db;
        $this->from = $from;
    }

    public function build(&$bound) {
        return "DELETE FROM " . $this->from . $this->buildWhere($bound);
    }

    public function execute($values = NULL) {
        $this->doExecute($values);
        return TRUE;    //TODO affected count
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
        if ($child) $this->children[] = $child;
    }

    public function parent() {
        return $this->parent;
    }

    public function add($field, $operator, $and, $valKey) {
        $this->children[] = new WhereItem($this, $field, $operator, $and, $valKey);
    }

    public function isEmpty() {
        return count($this->children) === 0;
    }

    public function build(&$bound, $first = FALSE) {
        if ($this->isEmpty()) return "";

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
        $bound[] = $this->valKey;
        return ($first ? "" : ($this->and ? " AND " : " OR ")) . $this->field . " " . $this->operator . " ?"; 
    }
}

abstract class WhereStatementBuilder {
    const VALUE_UNDEFINED = "__undefined__";

    public function __construct($logger) {
        $this->logger = $logger;
        $this->where = [];
        $this->values = [];
    }

    public function addFieldValue($field, $val) {
        $key = ($val !== WhereStatementBuilder::VALUE_UNDEFINED ? $field.':'.count($this->values) : $field);
        if ($val !== WhereStatementBuilder::VALUE_UNDEFINED)
            $this->values[$key] = $val;
        return $key;
    }

    public function where($field, $val = "__undefined__", $operator = "=", $and = TRUE) {
        $g = new WhereGroup(NULL, $and);
        $g->add($field, $operator, $and, $this->addFieldValue($field, $val));
        $this->where[] = $g;
        return new WhereGroupBuilder($this, $g);
    }

    protected function buildWhere(&$bound) {
        if (count($this->where) === 0) return "";

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
            foreach ($bound as $key) {
                $stmt->bindValue($i, $v[$key]);
                $i = $i + 1;
            }

            $this->logger->debug("DB prepared statement:", ["query" => $q, "bound" => $bound, "values" => $v]);
            
            $result = $stmt;
            if (!$stmt->execute())
                $result = FALSE;
        } else {
            $this->logger->debug("DB query", ["query" => $q]);
            $result = $this->db->query($q);
        }
        
        if (!$result) {
            $this->logger->error("DB QUERY FAILED:".$q." ".implode(" ", $this->db->errorInfo()));
            throw new DatabaseException("Error executing db query");
        }
    }
}

class WhereGroupBuilder  {
    public function __construct($stmt, $group) {
        $this->stmt = $stmt;
        $this->group = $group;
    }

    public function and($field, $val = "__undefined__", $operator = "=") {
        $this->group->add($field, $operator, TRUE, $this->stmt->addFieldValue($field, $val));
        return $this;
    }

    public function or($field, $val = "__undefined__", $operator = "=") {
        $this->group->add($field, $operator, FALSE, $this->stmt->addFieldValue($field, $val));
        return $this;
    }

    public function parent() {
        $p = $this->group->parent();
        if ($p == NULL) return new WhereGroupBuilder($this->stmt, NULL);
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
        $p->add($g);
        $g->add($field, $operator, TRUE, $this->stmt->addFieldValue($field, $val));
        return new WhereGroupBuilder($this->stmt, $g);
    }

    public function orGroup($field, $val = "__undefined__", $operator = "=") {
        $g = new WhereGroup($this->group, FALSE);
        $p->add($g);
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

class SelectResult {
    private $result;
    private $rows = NULL;

    public function __construct($result) {
        $this->result = $result;
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

        $this->rows = $this->result->fetchAll(\PDO::FETCH_BOTH);
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

    public function valueMap($keyCol, $valueCol = NULL, $valueCol2 = NULL) {
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