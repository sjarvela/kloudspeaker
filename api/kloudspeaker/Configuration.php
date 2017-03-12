<?php
namespace Kloudspeaker;

class Configuration {

    public function __construct($configValues, $version, $serverProps = NULL) {
        $this->configValues = $configValues;
        $this->version = $version;
        $this->serverProps = $serverProps != NULL ? $serverProps : $_SERVER;
    }

    public function getHost() {
        $host = $this->serverProps["SERVER_NAME"];
        
        if ($this->serverProps["SERVER_PORT"] != "80") $host .= ":".$this->serverProps["SERVER_PORT"];
        
        if (Utils::strStartsWith($this->serverProps["SERVER_PROTOCOL"], "HTTPS/")) $host = "https://".$host;
        else $host = "http://".$host;

        return $host;
    }

    public function getRootPath() {
        $path = $this->serverProps["SCRIPT_NAME"];
        if (Utils::strEndsWith($path, "index.php")) $path = substr($path, 0, -9);

        return $this->getHost().$path;
    }

    public function getRootUrl() {
        return $this->getHost()."/".$this->getRootPath();
    }

    public function isDebug() {
        return $this->is("debug", FALSE);
    }

    public function get($name, $defaultValue = "__undefined__") {
        if (!isset($this->configValues[$name])) {
            if ($defaultValue === "__undefined__")
               throw new KloudspeakerException("Missing config value: ".$name, Errors::InvalidConfiguration);

            return $defaultValue;
        }
        return $this->configValues[$name];
    }

    public function is($name, $defaultValue = FALSE) {
        return isset($this->configValues[$name]) ? $this->configValues[$name] : $defaultValue;
    }

    public function has($name) {
        return array_key_exists($name, $this->configValues);
    }
}