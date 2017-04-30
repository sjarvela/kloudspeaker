<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class SessionTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testSessionUnauthorized() {
        $res = $this->rq('GET', '/session/');
        $this->assertEquals('{"success":true,"result":{"id":null,"user":null,"features":{"limited_http_methods":false,"change_password":true,"descriptions":true,"user_groups":true,"mail_notification":false,"retrieve_url":false,"folder_protection":false,"thumbnails":false},"plugins":[]}}', $res->text());
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

    public function testSessionWithHeader() {
        $res = $this->rq('GET', '/session/', NULL, NULL, ['kloudspeaker-session' => ['159048baa6584b']]);

        $this->assertEquals('{"success":true,"result":{"id":"159048baa6584b","user":{"id":"1","0":"1","name":"Admin","1":"Admin","user_type":"a","2":"a","lang":"en","3":"en","email":"admin@mail.com","4":"admin@mail.com","auth":"","5":"","expiration":null,"6":null},"features":{"limited_http_methods":false,"change_password":true,"descriptions":true,"user_groups":true,"mail_notification":false,"retrieve_url":false,"folder_protection":false,"thumbnails":false},"plugins":[],"filesystem":{"max_upload_file_size":33554432,"max_upload_total_size":33554432,"allowed_file_upload_types":[],"forbidden_file_upload_types":[],"supported_thumbnail_types":[]},"folders":[],"roots":[],"permissions":{"change_password":"1"},"permission_types":{"keys":{"generic":["change_password"],"filesystem":["filesystem_item_access","edit_description"],"all":["change_password","filesystem_item_access","edit_description"]},"values":{"change_password":null,"filesystem_item_access":["n","r","rw","rwd"],"edit_description":null}}}}', $res->text());
    }

    public function testSessionWithCookie() {
        $res = $this->rq('GET', '/session/', NULL, NULL, NULL, ['kloudspeaker-session' => '159048baa6584b']);

        $this->assertEquals('{"success":true,"result":{"id":"159048baa6584b","user":{"id":"1","0":"1","name":"Admin","1":"Admin","user_type":"a","2":"a","lang":"en","3":"en","email":"admin@mail.com","4":"admin@mail.com","auth":"","5":"","expiration":null,"6":null},"features":{"limited_http_methods":false,"change_password":true,"descriptions":true,"user_groups":true,"mail_notification":false,"retrieve_url":false,"folder_protection":false,"thumbnails":false},"plugins":[],"filesystem":{"max_upload_file_size":33554432,"max_upload_total_size":33554432,"allowed_file_upload_types":[],"forbidden_file_upload_types":[],"supported_thumbnail_types":[]},"folders":[],"roots":[],"permissions":{"change_password":"1"},"permission_types":{"keys":{"generic":["change_password"],"filesystem":["filesystem_item_access","edit_description"],"all":["change_password","filesystem_item_access","edit_description"]},"values":{"change_password":null,"filesystem_item_access":["n","r","rw","rwd"],"edit_description":null}}}}', $res->text());
    }

    public function testSessionWithHeaderAndCookieUsesHeader() {
        $res = $this->rq('GET', '/session/', NULL, NULL, ['kloudspeaker-session' => ['159048dcdb7145']], ['kloudspeaker-session' => '159048baa6584b']);

        $this->assertEquals('{"success":true,"result":{"id":"159048dcdb7145","user":{"id":"2","0":"2","name":"u1","1":"u1","user_type":null,"2":null,"lang":"en","3":"en","email":"u1@mail.com","4":"u1@mail.com","auth":"","5":"","expiration":null,"6":null},"features":{"limited_http_methods":false,"change_password":true,"descriptions":true,"user_groups":true,"mail_notification":false,"retrieve_url":false,"folder_protection":false,"thumbnails":false},"plugins":[],"filesystem":{"max_upload_file_size":33554432,"max_upload_total_size":33554432,"allowed_file_upload_types":[],"forbidden_file_upload_types":[],"supported_thumbnail_types":[]},"folders":[],"permissions":{"change_password":null},"permission_types":{"keys":{"generic":["change_password"],"filesystem":["filesystem_item_access","edit_description"],"all":["change_password","filesystem_item_access","edit_description"]},"values":{"change_password":null,"filesystem_item_access":["n","r","rw","rwd"],"edit_description":null}}}}', $res->text());
    }
}