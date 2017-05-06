<?php
namespace Kloudspeaker;

class Configuration {

    public function __construct($systemInfo, $serverProps = NULL) {
        $this->systemInfo = $systemInfo;
        $this->serverProps = $serverProps != NULL ? $serverProps : $_SERVER;
        $this->values = $this->systemInfo["config"];
        if ($this->values == NULL) $this->values = [];
    }

    public function values() {
        return $this->values;
    }

    public function getSystemInfo() {
        return $this->systemInfo;
    }

    public function getInstallationRoot() {
        return $this->systemInfo["root"];
    }

    public function getSiteFolderLocation() {
        return $this->getInstallationRoot().DIRECTORY_SEPARATOR."site".DIRECTORY_SEPARATOR;
    }

    public function getConfigurationFileLocation() {
        return $this->getSiteFolderLocation().DIRECTORY_SEPARATOR."configuration.php";
    }

    public function getServerProperties() {
        return $this->serverProps;
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
        if (strpos($name, ".") !== FALSE) {
            $parts = explode(".", $name);
            $current = $this->values;
            foreach ($parts as $p) {
                if (!isset($current[$p]))
                    if ($defaultValue === "__undefined__")
                        throw new KloudspeakerException("Missing config value: ".$name, Errors::InvalidConfiguration);
                    else
                        return $defaultValue;

                $current = $current[$p];
            }
            return $current;
        }
        if (!isset($this->values[$name])) {
            if ($defaultValue === "__undefined__")
               throw new KloudspeakerException("Missing config value: ".$name, Errors::InvalidConfiguration);

            return $defaultValue;
        }
        return $this->values[$name];
    }

    private function setChildValue(&$list, $path, $value) {
        if (count($path) == 1)
            $list[$path[0]] = $value;
        else {
            $p = array_slice($path, 1);
            $n = $path[0];
            if (!isset($list[$n]))
                $list[$n] = [];
            $this->setChildValue($list[$n], $p, $value);
        }
    }

    public function set($name, $value) {
        echo \Kloudspeaker\Utils::array2str($this->values);
        /*if (strpos($name, ".") !== FALSE) {
            $parts = ;
            $n = $parts[count($parts)-1];

            $current = $this->values;
            foreach (array_slice($parts, 0, -1) as $p) {
                echo $p;
                if (!isset($current[$p]))
                    $current[$p] = [];
                $current = $current[$p];
            }
            $current[$n] = $value;
        } else {
            $this->values[$name] = $value;
        }*/
        $this->setChildValue($this->values, explode(".", $name), $value);
        echo \Kloudspeaker\Utils::array2str($this->values);
    }

    public function is($name, $defaultValue = FALSE) {
        return isset($this->values[$name]) ? $this->values[$name] : $defaultValue;
    }

    public function has($name) {
        return array_key_exists($name, $this->values);
    }

    public function setValues($values) {
        foreach ($values as $k => $v) {
            $this->set($k, $v);
        }
    }

    public function store() {
        $file = $this->getConfigurationFileLocation();

        if (!is_writable($file)) throw new \Kloudspeaker\KloudspeakerException("Configuration file not writable $file");
        file_put_contents($file, "<?php\n\$CONFIGURATION = ".var_export($this->values, TRUE).";");
    }
}