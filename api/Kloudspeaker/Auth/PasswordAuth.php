<?php
namespace Kloudspeaker\Auth;

class PasswordAuth {
    public function __construct($container) {
        $this->container = $container;
        $this->hash = $container->passwordhash;
    }

    public function authenticate($user, $pw) {
        $auth = $this->container->users->getUserAuth($user["id"]);

        if (!$auth) {
            $this->container->logger->error("User auth info not found");
            throw new \Kloudspeaker\NotAuthenticatedException("Authentication failed");
        }
        return ($this->hash->isEqual($pw, $auth["hash"], $auth["salt"]));
    }

    public function getInfo() {
        return [ "type" => "pw" ];
    }
}