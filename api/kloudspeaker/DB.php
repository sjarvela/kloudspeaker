<?php
namespace Kloudspeaker\DB;

class PDODatabase {
    public function __construct($logger, $dsn, $username, $pw) {
        $this->logger = $logger;
        $this->db = new \PDO($dsn, $username, $pw);
    }

    public function select(array $columns = array('*')) {
        return new SelectStatementBuilder($this->logger, $this->db, $columns);
    }
}

class SelectStatementBuilder {
    public function __construct($logger, $db, $cols) {
        $this->logger = $logger;
        $this->db = $db;
        $this->cols = $cols;
        $this->joins = [];
        $this->where = NULL;
        $this->orderBy = NULL;
    }

    public function from($from) {
        $this->from = $from;
        return $this;
    }

    public function leftJoin($table, $join) {
        $this->joins[] = 'LEFT OUTER JOIN '. $table. " on ".$join;
        return $this;
    }

    public function where($w) {
        if ($this->where == NULL)
            $this->where = new WhereClauseBuilder($this);
        return $this->where->and($w);
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
        $this->logger->debug("DB :".$q);

        if ($values) {
            $stmt = $this->db->prepare($q);
            foreach ($values as $key => $value) {
                $stmt->bindParam(':'.$key, $value);
            }
            $result = $stmt;
            if (!$stmt->execute())
                $result = FALSE;
        } else {
            $result = $this->db->query($q);
        }
        
        if (!$result) {
            $this->logger->error("DB QUERY FAILED:".$q." ".implode(" ", $this->db->errorInfo()));
            throw new \KloudspeakerException("Error executing db query");
        }
        return new SelectResult($result);
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