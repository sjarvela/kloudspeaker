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
require_once 'Kloudspeaker/Database/DatabaseFactory.php';
require_once 'Kloudspeaker/Database/DB.php';
require_once 'Kloudspeaker/Settings.php';
require_once 'Kloudspeaker/Plugins.php';
require_once 'Kloudspeaker/Formatters.php';
require_once 'Kloudspeaker/Repository/UserRepository.php';
require_once 'Kloudspeaker/Repository/SessionRepository.php';
require_once 'Kloudspeaker/Auth/PasswordAuth.php';
require_once 'Kloudspeaker/Auth/PasswordHash.php';
require_once 'Kloudspeaker/Command/CommandManager.php';
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
    }
    
    public function getDataSet() {
        return $this->createXmlDataSet(dirname(__FILE__) . '/datasets/' . $this->getDataSetName());
    }

    public function getDataSetName() {
        return 'default.xml';
    }

    protected function app() {
        return new AppBuilder(array_merge($this->config(), [
            "debug" => TRUE,
            "db" => [
                "dsn" => $GLOBALS['DB_DSN'],
                "user" => $GLOBALS['DB_USER'],
                "password" => $GLOBALS['DB_PASSWD']
            ]
        ]));
    }

    protected function rq($method, $path, $query=NULL, $data = NULL, $headers = NULL, $cookies = []) {
        return $this->app()->run($method, $path, $query, $data, $headers, $cookies);
    }

    protected function get($path, $headers = NULL, $cookies = []) {
        return $this->app()->run('GET', $path, NULL, NULL, $headers, $cookies);
    }

    protected function post($path, $headers = NULL, $cookies = []) {
        return $this->app()->run('POST', $path, NULL, NULL, $headers, $cookies);
    }

    protected function config() {
        return [
            'now' => function() { return mktime(0, 0, 0, 1, 1, 2017); },
            'relative_path_root' => dirname(__FILE__)."/../fs/"
        ];
    }
}

class AppBuilder {
    public function __construct($c) {
        $this->config = $c;
        $this->method = "GET";
        $this->path = "/";
        $this->query = NULL;
        $this->data = NULL;
        $this->headers = [];
        $this->cookies = [];
        $this->modules = [];
    }

    public function header($name, $val) {
        $this->headers[$name] = [$val];
    }

    public function cookie($name, $val) {
        $this->cookies[$name] = [$val];
    }

    public function req($method, $path, $query=NULL, $data = NULL, $cookies = []) {
        $this->method = $method;
        $this->path = $path;
        $this->query = $query;
        $this->data = $data;
        $this->cookies = $cookies;
        return $this;
    }

    public function config($c) {
        $this->config = array_merge($this->config, $c);
        return $this;
    }

    public function module($p) {
        $this->modules[] = $p;
        return $this;
    }

    public function run($method = NULL, $path = NULL, $query=NULL, $data = NULL, $headers = NULL, $cookies = []) {
        $m = $this->method;
        if ($method != NULL) $m = $method;
        $p = $this->path;
        if ($path != NULL) $p = $path;
        $q = $this->query;
        if ($query != NULL) $q = $query;
        $d = $this->data;
        if ($data != NULL) $d = $data;
        $h = $this->headers;
        if ($headers != NULL) $h = $headers;
        $c = $this->cookies;
        if ($cookies != NULL) $c = $cookies;

        $_SERVER["REQUEST_METHOD"] = $m;

        $config = new Configuration(["config" => $this->config, "version" => "0.0.0", "revision" => "0"], [
            "SERVER_NAME" => "localhost",
            "SERVER_PORT" => 80,
            "SERVER_PROTOCOL" => "HTTP",
            "REQUEST_METHOD" => $m,
            "SCRIPT_NAME" => "index.php"
        ]);
        $app = new Api($config, [
            "addContentLengthHeader" => FALSE
        ]);
        $app->initialize(new \KloudspeakerLegacy($config), [
            "logger" => function() { return new TestLogger(); }
        ]);
        
        $app->initializeDefaultRoutes();

        foreach ($this->modules as $ml) {
            $app->addModule($ml);
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
        $sheaders = Headers::createFromEnvironment($env);
        if ($headers != NULL)
            foreach ($headers as $key => $value) {
                $sheaders->set($key, $value);
            }
        $serverParams = $env->all();
        
        if ($d != NULL) {
            $stream = fopen('php://memory','r+');
            fwrite($stream, json_encode($d));
            rewind($stream);
            $body = new Body($stream);
        } else {
            $body = new RequestBody();
        }

        $req = new Request($m, $uri, $sheaders, $c, $serverParams, $body);
        $res = new Response();

        $container = $app->getContainer();
        $container['cookie'] = function($container) use ($c) {
            return new \Slim\Http\Cookies($c);
        };
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
