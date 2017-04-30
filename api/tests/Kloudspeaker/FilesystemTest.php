<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class FilesystemTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testGetRoots() {
        $session = $this->get('/session/', ['kloudspeaker-session' => ['159048baa6584b']])->obj()["result"];
        $this->assertEquals(2, count($session["folders"]));

        $this->assertEquals("1", $session["folders"][0]["folder_id"]);
        $this->assertEquals("root1_id", $session["folders"][0]["id"]);
        $this->assertEquals("folder 1", $session["folders"][0]["name"]);
        $this->assertEquals("", $session["folders"][0]["path"]);

        $this->assertEquals("2", $session["folders"][1]["folder_id"]);
        $this->assertEquals("root2_id", $session["folders"][1]["id"]);
        $this->assertEquals("user 1 folder 2", $session["folders"][1]["name"]);
        $this->assertEquals("", $session["folders"][1]["path"]);
    }

    public function testGetFolderInfo() {
        $res = $this->get('/filesystem/root1_id/info/', ['kloudspeaker-session' => ['159048baa6584b']])->text();

        $this->assertEquals('{"success":true,"result":{"folder":{"id":"root1_id","root_id":"root1_id","parent_id":"","name":"folder 1","path":"","is_file":false},"files":[],"folders":[],"items":[],"permissions":{"filesystem_item_access":"rwd","edit_description":"1"},"data":[]}}', $res);
    }


}