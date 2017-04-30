<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class RestApiTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testUnknownPath() {
        $res = $this->rq('GET', '/foo/');
        $this->assertEquals('{"success":false,"error":{"code":-1,"msg":"Route not found","result":null}}', $res->text());
    }

    public function testLoadModuleFileAndClass() {
        $res = $this->app()->config(["load_modules" => ["tests/Kloudspeaker/Modules/Module1:\Kloudspeaker\Test\TestModule1"]])->req('GET', '/test/module1')->run();

        $this->assertEquals('{"success":true,"result":"test1"}', $res->text());
    }

    public function testLoadModuleClass() {
        require_once "tests/Kloudspeaker/Modules/Module2.php";

        $res = $this->app()->config(["load_modules" => ["\Kloudspeaker\Test\TestModule2"]])->req('GET', '/test/module2')->run();

        $this->assertEquals('{"success":true,"result":"test2"}', $res->text());
    }

    public function testSuccess() {
        $res = $this->app()->module(function($m) {
            $m->route('myplugin', function() {
                $this->get('/test', function ($request, $response, $args) {
                    $this->out->success("wohoo");
                });
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals('{"success":true,"result":"wohoo"}', $res->text());
    }

    public function testException() {
        $res = $this->app()->module(function($m) {
            $m->route('myplugin', function() {
                $this->get('/test', function ($request, $response, $args) {
                    throw new \Kloudspeaker\KloudspeakerException("foo");
                });
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(500, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":0,"msg":"foo","result":null}}', $res->text());
    }

    public function testExceptionWithCode() {
        $res = $this->app()->module(function($m) {
            $m->route('myplugin', function() {
                $this->get('/test', function ($request, $response, $args) {
                throw new \Kloudspeaker\KloudspeakerException("foo", Errors::FeatureNotEnabled);
                });
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(500, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":-3,"msg":"foo","result":null}}', $res->text());
    }

    public function testExceptionWithStatus() {
        $res = $this->app()->module(function($m) {
            $m->route('myplugin', function() {
                $this->get('/test', function ($request, $response, $args) {
                    throw new \Kloudspeaker\KloudspeakerException("foo", Errors::FeatureNotEnabled, HttpCodes::FORBIDDEN);
                });
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(403, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":-3,"msg":"foo","result":null}}', $res->text());
    }

    public function testUnknownException() {
        $res = $this->app()->module(function($m) {
            $m->route('myplugin', function() {
                $this->get('/test', function ($request, $response, $args) {
                    throw new \Exception("foo");
                });
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(500, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":0,"msg":"Unknown error"}}', $res->text());
    }
}