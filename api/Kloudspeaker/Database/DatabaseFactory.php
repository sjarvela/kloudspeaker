<?php
namespace Kloudspeaker\Database;

class DatabaseFactory {

    public function __construct($container) {
        $this->container = $container;
    }

    public function checkConnection() {
        $dbc = $this->container->configuration->get("db");
        try {
            $pdo = new \PDO($dbc['dsn'], $dbc['user'], $dbc['password'], array(\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION));
        } catch (\PDOException $e) {
            return ["connection" => FALSE, "reason" => $e->getMessage()];
        }
        return ["connection" => TRUE];
    }

    public function createDb() {
        $dbConfig = $this->container->configuration->get("db");
        $db = new \PDO($dbConfig["dsn"], $dbConfig["user"], $dbConfig["password"]);
        return new Database($db, $this->container->logger);
    }

   
}