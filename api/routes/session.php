<?php
$container->logger->debug("route");

function getSessionInfo($c) {
	$user = $c->session->getUser();
	//$this->logger->debug("session", ["user" => $user]);
	return [
		"id" => $c->session->getId(),
    	"user" => $user,
    	"features" => []
    ];
};

$app->get('/session/', function ($request, $response, $args) {
    $this->out->success(getSessionInfo($this));
});

$app->post('/session/authenticate/', function ($request, $response, $args) {
	$username = $request->getParam("username");
	$password = base64_decode($request->getParam("password"));
	$remember = $request->getParam("remember", "0") == "1";

	$this->logger->debug("Auth", ["user" => $username]);

	$user = $this->authentication->authenticate($username, $password);
	if ($user) {
		$this->session->start($user);
		return $this->out->success(getSessionInfo($this));		
	}
	return $this->out->error("Authentication failed");
});//->add(AuthRoute::class);

$app->post('/session/end/', function ($request, $response, $args) {
	$this->session->end();
	return $this->out->success(getSessionInfo($this));
});//->add(AuthRoute::class);