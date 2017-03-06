<?php
namespace Kloudspeaker;

class Authentication {
    public function __construct($container) {
        $this->container = $container;
    }

    public function authenticate($username, $password) {
		$user = $this->container->users->find($username, $this->container->configuration->get("email_login", FALSE), time());
		if (!$user) throw new NotAuthenticatedException("Authentication failed");

        $authModule = $this->getAuthenticationModule($user["auth"]);
        if (!$authModule->authenticate($user, $password)) {
            $msg = "Failed Kloudspeaker login attempt from [" . $this->container->request->getAttribute('ip_address') . "], user [" . $username . "]";
            $this->container->logger->error($msg);
            syslog(LOG_NOTICE, $msg);
            //TODO $this->env->events()->onEvent(SessionEvent::failedLogin($username, $this->env->request()->ip()));
            throw new NotAuthenticatedException("Authentication failed");
        }
        
		return $user;
    }

    private function getAuthenticationModule($type) {
        $t = "pw";
        //TODO default from config
        if ($type != NULL) $t = strtolower($type);
        return $this->container['auth_'.$t];
    }
}