<?php

$app->get('/session/info', function ($request, $response, $args) {
	$this->logger->info("Session info");
    $this->out->error("Foo happened");
});

$app->get('/session/auth', function ($request, $response, $args) {
	$this->logger->addInfo("Session info");
    $this->out->success(array('foo' => 'bar'));
})->add(AuthRoute::class);