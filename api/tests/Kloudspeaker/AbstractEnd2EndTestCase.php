<?php

namespace Kloudspeaker;

require_once 'vendor/auto/autoload.php';
require_once 'Kloudspeaker/Api.php';
require_once 'Kloudspeaker/Configuration.php';
require_once 'Kloudspeaker/Utils.php';
require_once 'Kloudspeaker/legacy/Legacy.php';
require_once 'Kloudspeaker/Authentication.php';
require_once 'Kloudspeaker/Features.php';
require_once 'Kloudspeaker/Session.php';
require_once 'Kloudspeaker/Database/DB.php';
require_once 'Kloudspeaker/Settings.php';
require_once 'Kloudspeaker/Formatters.php';
require_once 'Kloudspeaker/Repository/UserRepository.php';
require_once 'Kloudspeaker/Repository/SessionRepository.php';
require_once 'Kloudspeaker/Auth/PasswordAuth.php';
require_once 'Kloudspeaker/Auth/PasswordHash.php';
require_once 'Routes/Session.php';

require_once "tests/Kloudspeaker/AbstractPDOTestCase.php";
require_once "tests/Kloudspeaker/TestLogger.php";

use Interop\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Slim\App;
use Slim\Container;
use Slim\Exception\MethodNotAllowedException;
use Slim\Exception\NotFoundException;
use Slim\Exception\SlimException;
use Slim\Handlers\Strategies\RequestResponseArgs;
use Slim\Http\Body;
use Slim\Http\Environment;
use Slim\Http\Headers;
use Slim\Http\Request;
use Slim\Http\RequestBody;
use Slim\Http\Response;
use Slim\Http\Uri;
use Slim\Router;
use Slim\Tests\Mocks\MockAction;


abstract class AbstractEnd2EndTestCase extends \Kloudspeaker\AbstractPDOTestCase {

    protected function setup() {
        parent::setup();
        $this->config = new Configuration([
            "debug" => TRUE,
            "db" => [
                "dsn" => $GLOBALS['DB_DSN'],
                "user" => $GLOBALS['DB_USER'],
                "password" => $GLOBALS['DB_PASSWD']
            ]
        ], ["version" => "0.0.0", "revision" => "0"], [
            "SERVER_NAME" => "test",
            "SERVER_PORT" => 80,
            "SERVER_PROTOCOL" => "HTTP",
            "SCRIPT_NAME" => "index.php"
        ]);
        $this->api = new Api($this->config, [
            "addContentLengthHeader" => FALSE
        ]);
        $this->api->initialize(new \KloudspeakerLegacy($this->config), [
            "logger" => new TestLogger()
        ]);
    }
    
    public function getDataSet() {
        return $this->createXmlDataSet(dirname(__FILE__) . '/dataset.xml');
    }

    protected function req($method, $path, $query=NULL, $data = NULL) {
        $app = $this->api;

        // Prepare request and response objects
        $env = Environment::mock([
            'SCRIPT_NAME' => '/index.php',
            'REQUEST_URI' => $path,
            'REQUEST_METHOD' => $method,
        ]);
        $uri = Uri::createFromEnvironment($env);
        if ($query != NULL)
            $uri = $uri->withQuery($query);
        $headers = Headers::createFromEnvironment($env);
        $cookies = [];
        $serverParams = $env->all();
        
        if ($data != NULL) {
            $stream = fopen('php://memory','r+');
            fwrite($stream, json_encode($data));
            rewind($stream);
            $body = new Body($stream);
        } else {
            $body = new RequestBody();
        }

        $req = new Request($method, $uri, $headers, $cookies, $serverParams, $body);
        $res = new Response();

        $container = $app->getContainer();
        $container['request'] = function ($c) use ($req) {
            return $req;
        };
        $container['response'] = function ($c) use ($res) {
            return $res;
        };

        // routes
        $app->initializeDefaultRoutes();

        ob_clean();
        return new ResponseReader($app->run());
    }
}

class ResponseReader {

    public function __construct($res) {
        $this->res = $res;
    }

    public function text() {
        return ((string)$this->res->getBody());
    }

    public function obj() {
        return json_decode($this->text(), TRUE);
    }
}
