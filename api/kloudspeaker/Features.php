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
        "guest_mode" => FALSE,
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

    public function isFeatureEnabled($feature) {
        if (!array_key_exists($feature, $this->features))
            return FALSE;
        return $this->features[$feature];
    }

    public function assertFeature($feature) {
        if (!$this->isFeatureEnabled($feature)) {
            throw new KloudspeakerException("Required feature not enabled: " . $feature, Errors::FeatureNotEnabled);
        }

    }

    public function getFeatures() {
        return $this->features;
    }
}