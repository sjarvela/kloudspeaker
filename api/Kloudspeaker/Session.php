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
        $id = $request->getHeader('kloudspeaker-session');

        if ($id and count($id) > 0) $this->id = $id[0];
		else $this->id = $this->container->cookie->get('kloudspeaker-session');

        if (!$this->id) return;

        $this->container->logger->debug("Session init ".$this->id);

        $time = $this->container->now;
        $session = $this->container->sessions->get($this->id, $this->getLastValidSessionTime($time));

        if ($session) {
            $this->container->logger->debug("Session ", $session);
            // load user data
            if ($session["user_id"] != 0) {
                $this->user = $this->container->users->get($session["user_id"], $time);
                $this->container->logger->debug("User ", $this->user);
                if (!$this->user) {
                    // user expired
                    $this->end();
                    return;
                }
            } else {
                // TODO anonymous session
                $this->end();
                return;
            }
        } else {
            $this->end();
            return;
        }

        // user found, extend session time
        $this->container->sessions->updateSessionTime($this->id, $time);
    }

    public function start($user, array $data = NULL) {
        $this->id = uniqid(TRUE);
        $this->user = $user;
        $ip = $this->container->request->getAttribute('ip_address');

        $time = $this->container->now;
        $this->container->sessions->add($this->id, $this->user["id"], $ip, $time);
        if ($data and count($data) > 0) {
            $this->container->sessions->addData($this->id, $data);
        }

        $this->setCookie($this->id);
    }

    public function end() {
        $this->container->logger->debug("Ending/clearing session");

        $this->id = NULL;
        $this->user = NULL;
        $this->setCookie(NULL);
        $this->removeAllExpiredSessions();
    }

    public function isLoggedIn() {
    	return ($this->user != NULL);
    }

    public function getId() {
    	return $this->id;
    }

    public function getUser() {
    	return $this->user;
    }

    public function isAdmin() {
        if ($this->user == NULL) return FALSE;
        return strcasecmp($this->user["user_type"], 'a') == 0;
    }

    public function removeAllExpiredSessions() {
        $this->container->sessions->removeAllSessionBefore($this->getLastValidSessionTime(time()));
    }

    private function getLastValidSessionTime($from = NULL) {
        $removed = $this->container->configuration->get("session_time", 7200);
        if (!$from) {
            return time() - $removed;
        }

        return $from - $removed;
    }

    private function setCookie($val) {
        $offset = 60 * 60 * 24 * 30 * 12 * 10;  // 10 years
        if (!$val) $offset = -3600;

        //TODO remove cookie if null
        $this->container->cookie->set('kloudspeaker-session', [
            "value" => $val,
            "path" => "/",
            'expires' => date('Y-m-d H:i:s', time() + $offset)
        ]);
    }

}