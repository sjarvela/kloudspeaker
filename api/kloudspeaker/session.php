<?php
namespace Kloudspeaker;

use Dflydev\FigCookies\FigResponseCookies;
use Dflydev\FigCookies\FigRequestCookies;
use Dflydev\FigCookies\SetCookie;

class Session {
	private $id = NULL;
	private $user = NULL;

    public function __construct($container) {
        $this->container = $container;
        $this->user = NULL;        
    }

    public function initialize($request) {
		$this->id = $this->container->cookie->get('kloudspeaker-session');

        if ($this->id) {
        $this->container->logger->debug("Session init ".$this->id);
            $sessionData = $this->container->sessions->get($this->id);
            if ($sessionData) {

            } else {
                $this->id = NULL;
            }
        }
    }

    public function start($user) {
        $this->id = uniqid(TRUE);
        $this->user = $user;
        $this->container->cookie->set('kloudspeaker-session', [
            "value" => $this->id,
            "path" => "/"
        ]);
    }

    public function isLoggedIn() {
    	return $this->user != NULL;
    }

    public function getId() {
    	return $this->id;
    }

    public function getUser() {
    	return $this->user;
    }
}