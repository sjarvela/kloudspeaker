<?php
namespace Kloudspeaker\Repository;

class SessionRepository {
    public function __construct($container) {
        $this->logger = $container->logger;
        $this->db = $container->db;
        $this->timeFormatter = $container->formatters->getTimeFormatter();
    }

    public function get($id, $lastValid = NULL) {
        return $this->db->select(['id', 'user_id', 'ip', 'time', 'last_access'])->from('session')->where('id = :id')->done()->execute(['id' => $id])->firstRow();
    }
}