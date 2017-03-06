<?php
namespace Kloudspeaker\DB;

class PDODatabase {
    public function __construct($logger, $dsn, $username, $pw) {
        $this->logger = $logger;
        $this->db = new \PDO($dsn, $username, $pw);
    }

    public function startTransaction() {
        $this->db->startTransaction();
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
}

class SelectStatementBuilder {
    public function __construct($logger, $db, $from, $cols) {
        $this->logger = $logger;
        $this->db = $db;
        $this->cols = $cols;
        $this->joins = [];
        $this->values = [];
        $this->from = $from;
        $this->where = NULL;
        $this->orderBy = NULL;
    }

    public function leftJoin($table, $join) {
        $this->joins[] = 'LEFT OUTER JOIN '. $table. " on ".$join;
        return $this;
    }

    public function where($w, $val = "__undefined__", $operator = '=') {
        $ws = $w;
        if ($val !== "__undefined__") {
            //TODO check $w does not have operator
            if (\Kloudspeaker\Utils::startsWith($val, ":")) {
                $ws = $w." ".$operator." ".$val;
            } else {
                $this->values[$w] = $val;
                $ws = $w." ".$operator." :".$w;
            }
        }

        if ($this->where == NULL)
            $this->where = new WhereClauseBuilder($this);
        return $this->where->and($ws);
    }

    public function orderBy($o) {
        $this->orderBy = $o;
        return $this;
    }

    private function build() {
        $q = "SELECT " . implode(", ", $this->cols) . " FROM " . $this->from;
        if (count($this->joins) > 0)
            $q .= " ".implode(" ", $this->joins);
        if ($this->where != NULL)
            $q .= ' WHERE '.$this->where->build();
        if ($this->orderBy != NULL)
            $q .= ' ORDER BY '.$this->orderBy;
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
        return new SelectResult($result);
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
            if (!Utils::isAssocArray($values)) {
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

    private function build() {
        $q = "INSERT INTO " . $this->into . "(" . implode(", ", $this->cols) . ") VALUES (" . Utils::strList('?', count($this->cols), ', ') . ")";
        return $q;
    }

    public function execute() {
        if (!$this->values or count($this->values) === 0) throw new DatabaseException("Invalid query, missing values");

        $q = $this->build();
        $this->logger->debug("DB :".$q);

        $this->db->startTransaction();
        $stmt = $this->db->prepare($q);
        foreach ($this->values as $row) {
            $field = 1;
            foreach ($this->cols as $col) {
                $stmt->bindValue($field, $value);
                $field = $field + 1;
            }
            if (!$stmt->execute()) {
                $this->logger->error("DB QUERY FAILED: ".$q." ".\Kloudspeaker\Utils::array2str($this->db->errorInfo()));
                throw new DatabaseException("Error executing db query");
            }
        }
        $this->db->commit();
        return TRUE;
    }

    public function toString() {
        return $this->build();
    }
}

class WhereClauseBuilder {
    public function __construct($stmt) {
        $this->stmt = $stmt;
        $this->list = [];
    }

    public function and($w) {
        $this->list[] = ' AND '.$w;
        return $this;
    }

    public function or($w) {
        $this->list[] = ' OR '.$w;
        return $this;
    }

    public function build() {
        $s = "1=1";
        if (count($this->list) < 1) return $s;

        $s .= implode(" ", $this->list);
        return $s;
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