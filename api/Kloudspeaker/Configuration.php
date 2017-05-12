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

    public function isSystemConfigured() {
        return $this->systemInfo["config_exists"];
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
            $current = $this->values;
            foreach (explode(".", $name) as $p) {
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
        $this->setChildValue($this->values, explode(".", $name), $value);
    }

    public function is($name, $defaultValue = FALSE) {
        $v = $this->get($name, $defaultValue);
        if ($v === FALSE) return FALSE;
        if ($v == NULL or $v === 0 or $v === '0' or $v === '') return FALSE;
        //TODO non-boolean values that equal to false
        return TRUE;
    }

    public function has($name, $requireNonEmptyOrNull = FALSE) {
        if (strpos($name, ".") !== FALSE) {
            $current = $this->values;
            foreach (explode(".", $name) as $p) {
                if (!isset($current[$p]))
                    return FALSE;
                $current = $current[$p];
            }
            if (!$requireNonEmptyOrNull) return TRUE;
            return ($current != NULL and $current !== "");
        }
        if (!array_key_exists($name, $this->values)) return FALSE;
        if (!$requireNonEmptyOrNull) return TRUE;
        $v = $this->values[$name];
        return ($v != NULL and $v !== "");
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