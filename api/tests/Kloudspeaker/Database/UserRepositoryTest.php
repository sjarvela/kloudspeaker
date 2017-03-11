<?php

namespace Kloudspeaker;

require_once "AbstractPDOTestCase.php";
require_once "api/Kloudspeaker/Repository/UserRepository.php";

class UserRepositoryTest extends AbstractPDOTestCase {

    public function getDataSet() {
        return $this->createXmlDataSet(dirname(__FILE__) . DIRECTORY_SEPARATOR . 'dataset.xml');
    }

    public function testGetUser() {
    	$this->createDB();

    	$userRepository = new \Kloudspeaker\Repository\UserRepository($this);
    	$user = $userRepository->get('1');
    	$this->assertEquals('1', $user["id"]);
        $this->assertEquals('Admin', $user["name"]);
        $this->assertEquals('en', $user["lang"]);
        $this->assertEquals('a', $user["user_type"]);
        $this->assertEquals('admin@mail.com', $user["email"]);
        $this->assertNull($user["expiration"]);
    }
}
