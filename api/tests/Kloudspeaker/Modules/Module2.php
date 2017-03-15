<?php

namespace Kloudspeaker\Test;

class TestModule2 {
	public function initialize($m) {
        $m->route('test', function() {
            $this->get('/module2', function ($request, $response, $args) {
                $this->out->success("test2");
            });
        });
	}
}