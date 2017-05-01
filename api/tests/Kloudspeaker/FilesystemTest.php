<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class FilesystemTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testGetRoots() {
        $session = $this->get('/session/', ['kloudspeaker-session' => ['159048baa6584b']])->obj()["result"];
        $this->assertEquals(2, count($session["folders"]));

        $this->assertEquals("1", $session["folders"][0]["folder_id"]);
        $this->assertEquals("root1", $session["folders"][0]["id"]);
        $this->assertEquals("folder 1", $session["folders"][0]["name"]);
        $this->assertEquals("", $session["folders"][0]["path"]);

        $this->assertEquals("2", $session["folders"][1]["folder_id"]);
        $this->assertEquals("root2", $session["folders"][1]["id"]);
        $this->assertEquals("user 1 folder 2", $session["folders"][1]["name"]);
        $this->assertEquals("", $session["folders"][1]["path"]);
    }

    public function testGetFolderInfo() {
        $res = $this->get('/filesystem/root1/', ['kloudspeaker-session' => ['159048baa6584b']])->obj()["result"];

        $this->assertEquals("root1", $res["folder"]["id"]);
        $this->assertEquals("folder 1", $res["folder"]["name"]);
        $this->assertEquals("root1", $res["folder"]["root_id"]);
        $this->assertFalse($res["folder"]["is_file"]);

        $this->assertEquals(3, count($res["items"]));

        $this->assertEquals("root1_sf1", $res["items"][0]["id"]);
        $this->assertEquals("sf1", $res["items"][0]["name"]);
        $this->assertFalse($res["items"][0]["is_file"]);
        $this->assertEquals("root1", $res["items"][0]["root_id"]);
        $this->assertEquals("root1", $res["items"][0]["parent_id"]);

        $this->assertEquals("root1_img", $res["items"][1]["id"]);
        $this->assertEquals("img.png", $res["items"][1]["name"]);
        $this->assertTrue($res["items"][1]["is_file"]);
        $this->assertEquals("root1", $res["items"][1]["root_id"]);
        $this->assertEquals("root1", $res["items"][1]["parent_id"]);

        $this->assertEquals("root1_text", $res["items"][2]["id"]);
        $this->assertEquals("text.txt", $res["items"][2]["name"]);
        $this->assertTrue($res["items"][2]["is_file"]);
        $this->assertEquals("root1", $res["items"][2]["root_id"]);
        $this->assertEquals("root1", $res["items"][2]["parent_id"]);

        $this->assertEquals(2, count($res["files"]));
        $this->assertEquals("root1_img", $res["files"][0]["id"]);
        $this->assertEquals("root1_text", $res["files"][1]["id"]);

        $this->assertEquals(1, count($res["folders"]));
        $this->assertEquals("root1_sf1", $res["folders"][0]["id"]);

        /*$this->assertEquals('{"success":true,"result":{"folder":{"id":"root1_id","root_id":"root1_id","parent_id":"","name":"folder 1","path":"","is_file":false},"files":[],"folders":[],"items":[],"permissions":{"filesystem_item_access":"rwd","edit_description":"1"},"data":[]}}'
+'{"success":true,"result":{"folder":{"id":"root1_id","root_id":"root1_id","parent_id":"","name":"folder 1","path":"","is_file":false},"files":[{"id":"root1_img","root_id":"root1_id","parent_id":"root1_id","name":"img.png","path":"img.png","is_file":true,"size":6673,"extension":"png"},{"id":"root1_text","root_id":"root1_id","parent_id":"root1_id","name":"text.txt","path":"text.txt","is_file":true,"size":3,"extension":"txt"}],"folders":[],"items":[{"id":"root1_img","root_id":"root1_id","parent_id":"root1_id","name":"img.png","path":"img.png","is_file":true,"size":6673,"extension":"png"},{"id":"root1_text","root_id":"root1_id","parent_id":"root1_id","name":"text.txt","path":"text.txt","is_file":true,"size":3,"extension":"txt"}],"permissions":{"filesystem_item_access":"rwd","edit_description":"1"},"data":[]}}', $res);*/
    }


}