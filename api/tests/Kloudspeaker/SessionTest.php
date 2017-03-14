<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class SessionTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testSessionUnauthorized() {
        $res = $this->rq('GET', '/session/');
        $this->assertEquals('{"success":true,"result":{"id":null,"user":null,"features":[]}}', $res->text());
    }

    public function testLoginFailureInvalidUser() {
        $res = $this->rq('POST', '/session/authenticate/', "username=foo&password=bar");
        $this->assertEquals('{"success":false,"error":{"code":-100,"msg":"Authentication failed","result":null}}', $res->text());
    }

    public function testLoginFailureInvalidPassword() {
        $res = $this->rq('POST', '/session/authenticate/', "username=Admin&password=bar");
        $this->assertEquals('{"success":false,"error":{"code":-100,"msg":"Authentication failed","result":null}}', $res->text());
    }

    public function testLoginAdmin() {
        //pw = admin (base64)
        $res = $this->rq('POST', '/session/authenticate/', "username=Admin&password=YWRtaW4=")->obj();
        $this->assertTrue($res["success"]);

        $user = $res["result"]["user"];
        $this->assertEquals('1', $user["id"]);
        $this->assertEquals('Admin', $user["name"]);
    }

    public function testLoginRegularUser() {
        //pw = u1 (base64)
        $res = $this->rq('POST', '/session/authenticate/', "username=u1&password=dTE=")->obj();
        $this->assertTrue($res["success"]);

        $user = $res["result"]["user"];
        $this->assertEquals('2', $user["id"]);
        $this->assertEquals('u1', $user["name"]);
    }

    public function testLoginExpiredUser() {
        //pw = admin (base64)
        $res = $this->rq('POST', '/session/authenticate/', "username=expired&password=ZXhwaXJlZA==");
        $this->assertEquals('{"success":false,"error":{"code":-100,"msg":"Authentication failed","result":null}}', $res->text());
    }
}