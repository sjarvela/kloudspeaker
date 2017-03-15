<?php

namespace Kloudspeaker\Test;

class TestModule1 {
	public function initialize($m) {
        $m->route('test', function() {
            $this->get('/module1', function ($request, $response, $args) {
                $this->out->success("test1");
            });
        });
	}
}