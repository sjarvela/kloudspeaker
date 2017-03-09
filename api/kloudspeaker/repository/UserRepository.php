<?php
namespace Kloudspeaker\Repository;

use \Kloudspeaker\Database\Database as Database;

class UserRepository {
    public function __construct($container) {
        $this->logger = $container->logger;
        $this->db = $container->db;
        $this->timeFormatter = $container->formatters->getTimeFormatter();
    }

    //private function toUser($props) {
    //    return new \Kloudspeaker\Model\User($props['id'], $props['name'], $props['user_type'], $props['lang'], $props['email'], $props['auth']);
    //}

    public function find($name, $allowEmail = FALSE, $expiration = FALSE) {
        $cols = ['id', 'name', 'lower(user_type) as user_type', 'lower(lang) as lang', 'email', 'lower(user_auth.type) as auth'];

        $q = $this->db->select('user', $cols)->leftJoin('user_auth', 'user.id = user_auth.user_id');
        $w = $q->where('is_group = 0');

        if ($expiration)
            $w->and('(expiration is null or expiration > :expiration)');

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

    public function get($id, $expiration = FALSE) {
        $cols = ['id', 'name', 'lower(user_type) as user_type', 'lower(lang) as lang', 'email', 'lower(user_auth.type) as auth'];

        $q = $this->db->select('user', $cols)->types(["is_group" => Database::TYPE_INT])->leftJoin('user_auth', 'user.id = user_auth.user_id');
        //TODO boolean support
        $w = $q->where('is_group', 0)->and('id', $id);

        //TODO custom timestamp support
        if ($expiration)
            $w->andWhere('expiration', $this->timeFormatter->formatTimestampInternal($expiration), '>')->orIsNull('expiration');

        $result = $q->execute();
        $matches = $result->count();

        if ($matches === 0) {
            $this->logger->error("No user found with id", ["id" => $id]);
            return NULL;
        }

        return $result->firstRow();
    }

    public function getUserAuth($userId) {
        $this->logger->debug("get auth ".$userId);

        return $this->db->select('user_auth', ['user_id', 'lower(type) as type', 'hash', 'salt', 'hint'])->where('user_id', $userId)->execute()->firstRow();
    }
}