<?php

require_once "TestCase.php";

class kloudspeakerTest extends kloudspeaker_TestCase {
	public function testNoSession() {
		$this->assertEqualArrayValues(array("authenticated" => FALSE), $this->processRequest("GET", "session/info"));
	}

	public function testAuthenticate() {
		try {
			$this->processRequest("POST", "session/authenticate", array(), array("username" => "wrong", "password" => "wrong"));
			$this->assertTrue(FALSE); //should never get here
		} catch (ServiceException $e) {
			$this->assertEquals("AUTHENTICATION_FAILED", $e->type());
		}
	}
}

?>