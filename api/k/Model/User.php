<?php
namespace Kloudspeaker\Model;

class User {
    public function __construct($id, $name, $type, $lang, $email, $auth) {
    	$this->id = $id;
    	$this->name = $name;
    	$this->type = $type;
    	$this->lang = $lang;
    	$this->email = $email;
    	$this->auth = $auth;
    }
    
}