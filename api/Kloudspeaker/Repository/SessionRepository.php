<?php
namespace Kloudspeaker\Repository;

use \Kloudspeaker\Database\Database as Database;

class SessionRepository {
    public function __construct($container) {
        $this->logger = $container->logger;
        $this->db = $container->db;
    }

    public function get($id, $lastValidAccess = NULL) {
        $q = $this->db->select('session', ['id', 'user_id', 'ip', 'time', 'last_access'])->types(["last_access" => Database::TYPE_DATETIME, "time" => Database::TYPE_DATETIME])->where('id', $id);
        if ($lastValidAccess != NULL) $q->and('last_access', $lastValidAccess, '>=');

        return $q->done()->execute()->firstRow();
    }

    public function add($id, $userId, $ip, $time) {
        $this->db->insert('session', ['id' => $id, 'user_id' => $userId, 'ip' => $ip, 'time' => $time, 'last_access' => $time])->types(["last_access" => Database::TYPE_DATETIME, "time" => Database::TYPE_DATETIME])->execute();
    }

    public function addData($id, $data) {
        $this->logger->debug("session data ", $data);
        $insert = $this->db->insert('session_data', ["session_id", "name", "value"]);
        foreach ($data as $k => $v) {
            $vs = $v;
            if (is_array($v)) {
                $vs = "[a=]".json_encode($v);
            }
            $insert->values(["session_id" => $id, "name" => $k, "value" => $vs]);
        }
        $insert->execute();
    }

    public function removeSession($id) {
        $this->db->startTransaction();
        $this->db->delete("session_data")->where("session_id", $id)->execute();
        $this->db->delete("session")->where("id", $id)->execute();
        $this->db->commit();
    }

    public function updateSessionTime($id, $time) {
        $this->db->update("session", ['last_access' => $time])->types(["last_access" => Database::TYPE_DATETIME, "time" => Database::TYPE_DATETIME])->where("id", $id)->execute();
    }

    public function removeAllSessionBefore($time) {
        $ids = $this->db->select('session', ['id'])->types(["last_access" => Database::TYPE_DATETIME, "time" => Database::TYPE_DATETIME])->where('last_access', $time, '<')->execute()->values("id");
        if (count($ids) == 0) {
            return;
        }
        $this->db->startTransaction();
        $this->db->delete("session_data")->whereIn("session_id", $ids)->execute();
        $this->db->delete("session")->whereIn("id", $ids)->execute();
        $this->db->commit();
    }
}