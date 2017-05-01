<?php

namespace Kloudspeaker;

require_once 'AbstractEnd2EndTestCase.php';

class PermissionTest extends \Kloudspeaker\AbstractEnd2EndTestCase {

    public function testAdminHasAllPermissions() {
        $res = $this->get('/filesystem/root1/info/', ['kloudspeaker-session' => ['159048baa6584b']])->obj()["result"];

        $this->assertEquals("rwd", $res["permissions"]["filesystem_item_access"]);
    }

    public function testUser2HasReadOnlyPermissions() {
        $res = $this->get('/filesystem/root2/info/', ['kloudspeaker-session' => ['159048dcdb7145']])->obj()["result"];

        $this->assertEquals("r", $res["permissions"]["filesystem_item_access"]);
    }

    public function testUser2CannotAccessRoot1() {
        $res = $this->get('/filesystem/root1/info/', ['kloudspeaker-session' => ['159048dcdb7145']])->obj();

        $this->assertFalse($res["success"]);
        $this->assertEquals(Errors::InsufficientPermissions, $res["error"]["code"]);
    }
}