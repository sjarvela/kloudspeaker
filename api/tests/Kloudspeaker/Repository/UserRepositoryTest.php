<?php

namespace Kloudspeaker\Repository;

require_once "tests/Kloudspeaker/AbstractPDOTestCase.php";
require_once "Kloudspeaker/Repository/UserRepository.php";

class UserRepositoryTest extends \Kloudspeaker\AbstractPDOTestCase {

    protected function setup() {
        parent::setup();
        $this->userRepository = new UserRepository($this);
    }

    public function getDataSet() {
        return $this->createXmlDataSet(dirname(__FILE__) . '/../dataset.xml');
    }

    public function testGetUser() {
        $user = $this->userRepository->get('1');
        $this->assertEquals('1', $user["id"]);
        $this->assertEquals('Admin', $user["name"]);
        $this->assertEquals('en', $user["lang"]);
        $this->assertEquals('a', $user["user_type"]);
        $this->assertEquals('admin@mail.com', $user["email"]);
        $this->assertNull($user["expiration"]);
    }

    public function testGetNonExistingUser() {
        $this->assertNull($this->userRepository->get('none'));
    }

    public function testFindUser() {
        $user = $this->userRepository->find('admin');
        $this->assertEquals('1', $user["id"]);
        $this->assertEquals('Admin', $user["name"]);
        $this->assertEquals('en', $user["lang"]);
        $this->assertEquals('a', $user["user_type"]);
        $this->assertEquals('admin@mail.com', $user["email"]);
        $this->assertNull($user["expiration"]);
    }

    public function testFindUser2() {
        $user = $this->userRepository->find('admin', TRUE);
        $this->assertEquals('1', $user["id"]);
    }

    public function testFindUserWithEmail() {
        $user = $this->userRepository->find('admin@mail.com', TRUE);
        $this->assertEquals('1', $user["id"]);
    }

    public function testFindNonExistingUser() {
        $this->assertNull($this->userRepository->find('none'));
    }

    public function testFindUserWithEmail2() {
        $this->assertNull($this->userRepository->find('admin@mail.com'));
    }
}
