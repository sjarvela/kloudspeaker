<?php
namespace Kloudspeaker\Route;

class Session {
    //$container = $app->getContainer();
    //$container->logger->debug("route");

    private function getSessionInfo($c) {
        $user = $c->session->getUser();
        //$this->logger->debug("session", ["user" => $user]);
        return [
            "id" => $c->session->getId(),
            "user" => $user,
            "features" => []
        ];
    }

    //TODO group
    public function initialize($app) {
        $t = $this;

        $app->route('session', function() use ($t) {
            $this->get('/', function ($request, $response, $args) use ($t) {
                $this->out->success($t->getSessionInfo($this));
            });

            $this->post('/authenticate/', function ($request, $response, $args) use ($t) {
                $username = $request->getParam("username");
                $password = base64_decode($request->getParam("password"));
                $remember = $request->getParam("remember", "0") == "1";

                $this->logger->debug("Auth", ["user" => $username]);

                $user = $this->authentication->authenticate($username, $password);
                if ($user) {
                    $this->session->start($user);
                    return $this->out->success($t->getSessionInfo($this));      
                }
                return $this->out->error("Authentication failed");
            });//->add(AuthRoute::class);

            $this->post('/end/', function ($request, $response, $args) use ($t) {
                $this->session->end();
                return $this->out->success($t->getSessionInfo($this));
            });//->add(AuthRoute::class);
        });
    }
}