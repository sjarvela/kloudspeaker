<?php

/**
 * Features.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class Features {
	private $features = array(
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

	private $defaultValues = array();

	function __construct($settings) {
		foreach ($this->features as $f => $e) {
			$enabled = $e;
			if ($settings->hasSetting("enable_" . $f)) {
				$enabled = $settings->setting("enable_" . $f);
			}
			$this->features[$f] = $enabled;
		}
	}

	public function addFeature($name) {
		$this->features[$name] = TRUE;
	}

	public function removeFeature($name) {
		$this->features[$name] = FALSE;
	}

	public function isFeatureEnabled($feature) {
		if (!in_array($feature, $this->features)) {
			throw new ServiceException("INVALID_REQUEST", "Invalid feature requested: " . $feature);
		}

		return $this->features[$feature];
	}

	public function assertFeature($feature) {
		if (!$this->isFeatureEnabled($feature)) {
			throw new ServiceException("FEATURE_DISABLED", "Required feature not enabled: " . $feature);
		}

	}

	public function getFeatures() {
		return $this->features;
	}

	function log() {
		Logging::logDebug("FEATURES: " . Util::array2str($this->features));
	}

	public function __toString() {
		return "Features";
	}
}
?>
