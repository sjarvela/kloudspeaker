<?php

function getSessionInfo($c) {
	$user = $c->session->getUser();
	//$this->logger->debug("session", ["user" => $user]);
	return [
		"id" => $c->session->getId(),
    	"user" => $user,
    	"features" => []
    ];
};

$app->get('/session/info/', function ($request, $response, $args) {
    $this->out->success(getSessionInfo($this));
});

$app->post('/session/authenticate/', function ($request, $response, $args) {
	$username = $request->getParam("username");
	$password = base64_decode($request->getParam("password"));
	$remember = $request->getParam("remember", "0") == "1";

	$this->logger->debug("Auth", ["user" => $username]);

	$user = $this->auth->authenticate($username, $password);
	if ($user) {
		$this->session->start($user);
		return $this->out->success(getSessionInfo($this));		
	}
	return $this->out->error("Authentication failed");
});//->add(AuthRoute::class);