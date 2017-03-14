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
    }
    
    public function getDataSet() {
        return $this->createXmlDataSet(dirname(__FILE__) . '/dataset.xml');
    }

    protected function app() {
        return new AppBuilder($this->config);
    }

    protected function rq($method, $path, $query=NULL, $data = NULL) {
        return $this->app()->run($method, $path, $query, $data);
    }

    protected function initializeApp($app) {}
}

class AppBuilder {
    public function __construct($config) {
        $this->config = $config;
        $this->method = "GET";
        $this->path = "/";
        $this->query = NULL;
        $this->data = NULL;
        $this->plugins = [];
    }

    public function req($method, $path, $query=NULL, $data = NULL) {
        $this->method = $method;
        $this->path = $path;
        $this->query = $query;
        $this->data = $data;
        return $this;
    }

    public function plugin($p) {
        $this->plugins[] = $p;
        return $this;
    }

    public function run($method = NULL, $path = NULL, $query=NULL, $data = NULL) {
        $m = $this->method;
        if ($method != NULL) $m = $method;
        $p = $this->path;
        if ($path != NULL) $p = $path;
        $q = $this->query;
        if ($query != NULL) $q = $query;
        $d = $this->data;
        if ($data != NULL) $d = $data;

        $app = new Api($this->config, [
            "addContentLengthHeader" => FALSE
        ]);
        $app->initialize(new \KloudspeakerLegacy($this->config), [
            "logger" => new TestLogger()
        ]);
        $app->initializeDefaultRoutes();
        foreach ($this->plugins as $pl) {
            $app->addPlugin($pl);
        }

        // Prepare request and response objects
        $env = Environment::mock([
            'SCRIPT_NAME' => '/index.php',
            'REQUEST_URI' => $p,
            'REQUEST_METHOD' => $m,
        ]);
        $uri = Uri::createFromEnvironment($env);
        if ($q != NULL)
            $uri = $uri->withQuery($q);
        $headers = Headers::createFromEnvironment($env);
        $cookies = [];
        $serverParams = $env->all();
        
        if ($d != NULL) {
            $stream = fopen('php://memory','r+');
            fwrite($stream, json_encode($d));
            rewind($stream);
            $body = new Body($stream);
        } else {
            $body = new RequestBody();
        }

        $req = new Request($m, $uri, $headers, $cookies, $serverParams, $body);
        $res = new Response();

        $container = $app->getContainer();
        $container['request'] = function ($c) use ($req) {
            return $req;
        };
        $container['response'] = function ($c) use ($res) {
            return $res;
        };

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

    public function status() {
        return $this->res->getStatusCode();
    }
}
