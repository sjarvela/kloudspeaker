<?php
namespace Kloudspeaker\Repository;

use \Kloudspeaker\Database\Database as Database;

class UserRepository {
    public function __construct($container) {
        $this->container = $container;
        $this->logger = $container->logger;
        $this->db = $container->db;
    }

    //private function toUser($props) {
    //    return new \Kloudspeaker\Model\User($props['id'], $props['name'], $props['user_type'], $props['lang'], $props['email'], $props['auth']);
    //}

    public function find($name, $allowEmail = FALSE, $expiration = FALSE) {
        $cols = ['id', 'name', 'lower(user_type) as user_type', 'lower(lang) as lang', 'email', 'lower(user_auth.type) as auth, expiration'];

        $q = $this->db->select('user', $cols)->types(["expiration" => Database::TYPE_DATETIME_INTERNAL, "is_group" => Database::TYPE_INT])->leftJoin('user_auth', 'user.id = user_auth.user_id');
        $w = $q->where('is_group', 0);

        if ($expiration)
            $w->andWhere('expiration', $expiration, '>')->orIsNull('expiration');

        if ($allowEmail)
            $w->andWhere('name', $name)->or('email', $name);
        else
            $w->andWhere('name', $name);

        $result = $q->execute();
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
        $cols = ['id', 'name', 'lower(user_type) as user_type', 'lower(lang) as lang', 'email', 'lower(user_auth.type) as auth, expiration'];

        $q = $this->db->select('user', $cols)->types(["expiration" => Database::TYPE_DATETIME_INTERNAL, "is_group" => Database::TYPE_INT])->leftJoin('user_auth', 'user.id = user_auth.user_id');
        //TODO boolean support
        $w = $q->where('is_group', 0)->and('id', $id);

        if ($expiration)
            $w->andWhere('expiration', $expiration, '>')->orIsNull('expiration');

        $result = $q->execute();
        $matches = $result->count();

        if ($matches === 0) {
            $this->logger->error("No user found with id", ["id" => $id]);
            return NULL;
        }

        return $result->firstRow();
    }

    public function add($user, $auth = NULL) {
        if ($auth != NULL) $this->db->startTransaction();

        $q = $this->db->select('user', ["count(id)"])->where('is_group', 0)->andWhere('name', $user["name"]);

        if (isset($user["email"]) and strlen($user["email"]) > 0) {
            $q->or('email', $user["email"]);
        }

        $matches = $q->execute()->value();

        if ($matches > 0) {
            throw new \Kloudspeaker\KloudspeakerException("Duplicate user found with name [" . $user["name"] . "] or email [" . (isset($user["email"]) ? $user["email"] : "") . "]");
        }

        $data = array_merge($user, ["lang" => NULL, "email" => NULL, "user_type" => NULL, "expiration" => NULL]);
        $data["is_group"] = 0;

        $this->db->insert("user", ["name", "lang", "email", "user_type", "is_group", "expiration"])->types(["expiration" => Database::TYPE_DATETIME_INTERNAL, "is_group" => Database::TYPE_INT])->values($data)->execute();

        $id = $this->db->lastId();
        if ($auth != NULL) {
            $this->storeAuth($id, $user["name"], isset($auth["type"]) ? $auth["type"] : NULL, $auth["pw"], isset($auth["hint"]) ? $auth["hint"] : NULL);
            $this->db->commit();
        }
        return $id;
    }

    public function getUserAuth($userId) {
        $this->logger->debug("get auth ".$userId);

        return $this->db->select('user_auth', ['user_id', 'lower(type) as type', 'hash', 'salt', 'hint'])->where('user_id', $userId)->execute()->firstRow();
    }

    public function storeAuth($id, $username, $type, $pw, $hint = "") {
        $transaction = $this->db->isTransaction();
        if (!$transaction) {
            $this->db->startTransaction();
        }

        $this->db->delete("user_auth")->where("user_id", $id)->execute();

        $hash = $this->container->passwordhash->createHash($pw);
        $hash["user_id"] = $id;
        $hash["a1hash"] = md5($username . ":" . $this->container->configuration->authRealm() . ":" . $pw);
        $hash["type"] = $type;
        $hash["hint"] = $hint;

        $this->db->insert("user_auth", ['user_id', 'type', 'hash', 'salt', 'hint'])->values($hash)->execute();

        if (!$transaction) {
            $this->db->commit();
        }
    }
}