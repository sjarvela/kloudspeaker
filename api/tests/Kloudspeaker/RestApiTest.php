<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class RestApiTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testUnknownPath() {
        $res = $this->rq('GET', '/foo/');
        $this->assertEquals('{"success":false,"error":{"code":0,"msg":"","result":null}}', $res->text());
    }

    public function testSuccess() {
        $res = $this->app()->plugin(function($app) {
            $app->get('/myplugin/test', function ($request, $response, $args) {
                $this->out->success("wohoo");
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals('{"success":true,"result":"wohoo"}', $res->text());
    }

    public function testException() {
        $res = $this->app()->plugin(function($app) {
            $app->get('/myplugin/test', function ($request, $response, $args) {
                throw new \Kloudspeaker\KloudspeakerException("foo");
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(500, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":0,"msg":"foo","result":null}}', $res->text());
    }

    public function testExceptionWithCode() {
        $res = $this->app()->plugin(function($app) {
            $app->get('/myplugin/test', function ($request, $response, $args) {
                throw new \Kloudspeaker\KloudspeakerException("foo", Errors::FeatureNotEnabled);
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(500, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":-3,"msg":"foo","result":null}}', $res->text());
    }

    public function testExceptionWithStatus() {
        $res = $this->app()->plugin(function($app) {
            $app->get('/myplugin/test', function ($request, $response, $args) {
                throw new \Kloudspeaker\KloudspeakerException("foo", Errors::FeatureNotEnabled, HttpCodes::FORBIDDEN);
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(403, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":-3,"msg":"foo","result":null}}', $res->text());
    }

    public function testUnknownException() {
        $res = $this->app()->plugin(function($app) {
            $app->get('/myplugin/test', function ($request, $response, $args) {
                throw new Exception("foo");
            });
        })->req('GET', '/myplugin/test')->run();

        $this->assertEquals(500, $res->status());
        $this->assertEquals('{"success":false,"error":{"code":0,"msg":"Unknown error"}}', $res->text());
    }
}