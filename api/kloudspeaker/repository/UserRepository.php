<?php
namespace Kloudspeaker\Repository;

class UserRepository {
    public function __construct($container) {
        $this->logger = $container->logger;
        $this->db = $container->db;
        $this->timeFormatter = $container->formatters->getTimeFormatter();
    }

    private function toUser($props) {
        return new \Kloudspeaker\Model\User($props['id'], $props['name'], $props['user_type'], $props['lang'], $props['email'], $props['auth']);
    }

    public function find($name, $allowEmail = FALSE, $expiration = FALSE) {
        $cols = ['id', 'name', 'lower(user_type) as user_type', 'lower(lang) as lang', 'email', 'lower(user_auth.type) as auth'];

        $q = $this->db->select($cols)->from('user')->leftJoin('user_auth', 'user.id = user_auth.user_id');
        $w = $q->where('(expiration is null or expiration > :expiration)')->and('is_group = 0');

        if ($allowEmail)
            $w->and('(name = :name or email = :name)');
        else
            $w->and('name = :name');

        $result = $q->execute([
            'expiration' => $this->timeFormatter->formatTimestampInternal($expiration),
            'name' => $name
        ]);
        $matches = $result->count();

        if ($matches === 0) {
            $this->logger->error("No user found with name", ["name" => $name]);
            return NULL;
        }

        if ($matches > 1) {
            $this->logger->error("Duplicate user found with name", ["name" => $name]);
            return NULL;
        }

        return $result->firstRow();
    }

    public function getUserAuth($userId) {
        $this->logger->debug("get auth ".$userId);
        return $this->db->select(['user_id', 'lower(type) as type', 'hash', 'salt', 'hint'])->from('user_auth')->where('user_id = :user_id')->done()->execute(['user_id' => $userId])->firstRow();
    }
}