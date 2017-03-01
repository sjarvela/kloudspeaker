<?php
namespace Kloudspeaker\Auth;

class PasswordAuth {
    public function __construct($container) {
        $this->container = $container;
        //TODO server hash & no_Dev_urandom
        $this->hash = new \Kloudspeaker\Auth\PasswordHash();
    }

    public function authenticate($user, $pw) {
        $auth = $this->container->users->getUserAuth($user["id"]);

        if (!$auth) {
            $this->container->logger->error("User auth info not found");
            throw new \Kloudspeaker\NotAuthenticatedException("Authentication failed");
        }
        return ($this->hash->isEqual($pw, $auth["hash"], $auth["salt"]));
    }

    private function getAuthenticationModule($type) {
        $t = "pw";
        //TODO default from config
        if ($type != NULL) $t = strtolower($type);
        return $this->container['auth_'.$t];
    }
}