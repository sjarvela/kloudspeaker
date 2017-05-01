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

    public function testGetRootFolderInfo() {
        $res = $this->get('/filesystem/root1/info/', ['kloudspeaker-session' => ['159048baa6584b']])->obj()["result"];

        $this->assertEquals("root1", $res["folder"]["id"]);
        $this->assertEquals("folder 1", $res["folder"]["name"]);
        $this->assertEquals("root1", $res["folder"]["root_id"]);
        $this->assertEquals("", $res["folder"]["parent_id"]);
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
    }

    public function testGetSubFolderInfo() {
        $res = $this->get('/filesystem/root1_sf1/info/', ['kloudspeaker-session' => ['159048baa6584b']])->obj()["result"];

        $this->assertEquals("root1_sf1", $res["folder"]["id"]);
        $this->assertEquals("sf1", $res["folder"]["name"]);
        $this->assertEquals("root1", $res["folder"]["root_id"]);
        $this->assertEquals("root1", $res["folder"]["parent_id"]);
        $this->assertFalse($res["folder"]["is_file"]);

        $this->assertEquals(1, count($res["items"]));

        $this->assertEquals("root1_sf1_text2", $res["items"][0]["id"]);
        $this->assertEquals("text2.txt", $res["items"][0]["name"]);
        $this->assertTrue($res["items"][0]["is_file"]);
        $this->assertEquals("root1", $res["items"][0]["root_id"]);
        $this->assertEquals("root1_sf1", $res["items"][0]["parent_id"]);

        $this->assertEquals(1, count($res["files"]));
        $this->assertEquals("root1_sf1_text2", $res["files"][0]["id"]);

        $this->assertEquals(0, count($res["folders"]));
    }

    public function testGetRootsUser2() {
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

    public function testGetRootFolderInfoUser2() {
        $res = $this->get('/filesystem/root2/info/', ['kloudspeaker-session' => ['159048dcdb7145']])->obj()["result"];

        $this->assertEquals("root2", $res["folder"]["id"]);
        //TODO should be "user 2 folder 2"
        $this->assertEquals("folder 2", $res["folder"]["name"]);
        $this->assertEquals("root2", $res["folder"]["root_id"]);
        $this->assertEquals("", $res["folder"]["parent_id"]);
        $this->assertFalse($res["folder"]["is_file"]);

        $this->assertEquals(1, count($res["items"]));

        $this->assertEquals("root2_text3", $res["items"][0]["id"]);
        $this->assertEquals("text3.txt", $res["items"][0]["name"]);
        $this->assertTrue($res["items"][0]["is_file"]);
        $this->assertEquals("root2", $res["items"][0]["root_id"]);
        $this->assertEquals("root2", $res["items"][0]["parent_id"]);

        $this->assertEquals(1, count($res["files"]));
        $this->assertEquals("root2_text3", $res["files"][0]["id"]);

        $this->assertEquals(0, count($res["folders"]));
    }

}