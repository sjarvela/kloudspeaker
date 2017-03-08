<?php
namespace Kloudspeaker\Repository;

class SessionRepository {
    public function __construct($container) {
        $this->logger = $container->logger;
        $this->db = $container->db;
    }

    public function get($id, $lastValid = NULL) {
        return $this->db->select('session', ['id', 'user_id', 'ip', 'time', 'last_access'])->where('id', $id)->done()->execute()->firstRow();
    }

    public function add($id, $userId, $ip, $time) {
        $this->db->insert('session', ['id' => $id, 'user_id' => $userId, 'ip' => $ip, 'time' => $time, 'last_access' => $time])->execute();
    }

    public function addData($id, $data) {
        $insert = $this->db->insert('session_data', ["session_id", "name", "value"]);
        foreach ($data as $k => $v)
            $insert->values([$id, $k, $v]);
        $insert->execute();
    }

    public function removeSession($id) {
        $this->db->startTransaction();
        $this->db->delete("session_data")->where("session_id", $id)->execute();
        $this->db->delete("session")->where("id", $id)->execute();
        $this->db->commit();
    }

    public function updateSessionTime($id, $time) {
        $this->db->update("session", ['last_access' => $time])->where("id", $id)->execute();
    }

    public function removeAllSessionBefore($time) {
        $ids = $this->db->select('session', ['id'])->where('last_access', $time, '<')->execute()->values("id");
        if (count($ids) == 0) {
            return;
        }
        $this->db->startTransaction();
        $this->db->delete("session_data")->whereIn("session_id", $ids)->execute();
        $this->db->delete("session")->whereIn("id", $ids)->execute();
        $this->db->commit();
    }
}