<?php
namespace Kloudspeaker;

class Features {

    private static $FEATURES_FROM_CONFIG = array(
        "limited_http_methods" => FALSE,
        "change_password" => TRUE,
        "descriptions" => TRUE,
        "user_groups" => TRUE,
        "mail_notification" => FALSE,
        "retrieve_url" => FALSE,
        "folder_protection" => FALSE,
        "thumbnails" => FALSE,
        //"guest_mode" => FALSE,
    );

    public function __construct($config) {
        $this->config = $config;

        $this->features = [];
        foreach (self::$FEATURES_FROM_CONFIG as $f => $e) {
            $this->features[$f] = $config->get("enable_" . $f, $e);
        }
    }

    public function addFeature($name) {
        $this->features[$name] = TRUE;
    }

    public function removeFeature($name) {
        $this->features[$name] = FALSE;
    }

    public function isFeatureEnabled($name) {
        if (!array_key_exists($name, $this->features))
            return FALSE;
        return $this->features[$name];
    }

    public function assertFeature($name) {
        if (!$this->isFeatureEnabled($name)) {
            throw new KloudspeakerException("Required feature not enabled: " . $name, Errors::FeatureNotEnabled);
        }
    }

    public function get($n = NULL) {
        if ($n != NULL) return $this->isFeatureEnabled($name);
        return $this->features;
    }
}