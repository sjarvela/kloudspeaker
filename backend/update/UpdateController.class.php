<?php

/**
 * UpdateController.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class UpdateController {
	protected $installer;

	public function __construct($installer) {
		$this->installer = $installer;
	}

	public function process() {
		$this->installer->init();
		if (!$this->installer->isInstalled()) {
			die();
		}

		$this->installer->processor()->createEnvironment($this->installer->db());
		//if (!$this->installer->processor()->authentication()->isAdmin()) die("Mollify Updater requires administrator user");

		if ($this->installer->isCurrentVersionInstalled() and $this->arePluginsUptodate()) {
			$this->installer->processor()->showPage("current_installed");
		}

		if ($this->installer->processor()->action() === 'update') {
			$this->update();
		}

		$this->installer->processor()->showPage("update");
	}

	public function versionString($ver) {
		return str_replace("_", ".", $ver);
	}

	private function arePluginsUptodate() {
		foreach ($this->installer->processor()->plugins()->getPlugins() as $id => $p) {
			if ($p->version() == NULL) {
				continue;
			}

			$installed = $this->installer->pluginInstalledVersion($id);
			$current = $p->version();

			if ($installed == NULL or strcmp($installed, $current) != 0) {
				return FALSE;
			}

		}
		return TRUE;
	}

	private function update() {
		$allPlugins = $this->installer->processor()->plugins()->getPlugins();
		$updates = array();

		try {
			$this->installer->db()->startTransaction();

			// update system if required
			$desc = $this->updateSystem();
			if ($desc) {
				$updates[] = $desc;
			}

			// update required plugins
			foreach ($allPlugins as $id => $p) {
				$desc = $this->updatePlugin($id, $p);
				if ($desc) {
					$updates[] = $desc;
				}

			}

			$this->installer->db()->commit();
		} catch (ServiceException $e) {
			$this->installer->db()->rollback();
			$this->installer->processor()->setError("Update failed", "<code>" . $e->details() . "</code>");
			$this->installer->processor()->showPage("update_error");
		}

		$this->installer->processor()->setData("updates", $updates);
		$this->installer->processor()->showPage("success");
	}

	private function updateSystem() {
		$installed = $this->installer->installedVersion();
		$current = $this->installer->currentVersion();
		$versionHistory = $this->installer->getVersionHistory();

		if (strcmp($installed, $current) == 0) {
			return;
		}

		if (!in_array($installed, $versionHistory)) {
			$this->installer->processor()->setError("Unknown version", "Installed version (" . $this->versionString($installed) . ") is unknown, and updater cannot continue.");
			$this->installer->processor()->showPage("update_error");
		}

		if (!in_array($current, $versionHistory)) {
			$this->installer->processor()->setError("Updater error", "Mollify updater does not contain the update required to update to current version, <a href='https://github.com/sjarvela/mollify/issues'>report a new updater issue</a>");
			$this->installer->processor()->showPage("update_error");
		}

		$indexFrom = array_search($installed, $versionHistory) + 1;
		$indexTo = array_search($current, $versionHistory);
		$stepFrom = $installed;

		for ($i = $indexFrom; $i <= $indexTo; $i++) {
			$stepTo = $versionHistory[$i];
			$this->installer->updateVersionStep($stepFrom, $stepTo);

			$conversion = $this->installer->getConversion($stepTo);
			if ($conversion != NULL) {
				$conversion->run($this->installer);
			}

			$stepFrom = $stepTo;
		}

		return "Mollify updated to " . $this->versionString($current);
	}

	private function updatePlugin($id, $plugin) {
		if ($plugin->version() == NULL) {
			return;
		}

		$basePath = NULL;
		$settings = $this->installer->processor()->settings()->setting("plugins");
		$ps = $settings[$id];
		if (isset($ps["custom"]) and $ps["custom"] == TRUE) {
			$basePath = $this->installer->processor()->resources()->getCustomizationsPath();
		}

		$installed = $this->installer->pluginInstalledVersion($id);
		$current = $plugin->version();
		$versionHistory = $plugin->versionHistory();

		if (strcmp($installed, $current) == 0) {
			return;
		}

		if ($installed != NULL and !in_array($installed, $versionHistory)) {
			$this->installer->processor()->setError("Unknown version", "Plugin " . $id . " installed version (" . $this->versionString($installed) . ") is unknown, and updater cannot continue.");
			$this->installer->processor()->showPage("update_error");
		}

		if (!in_array($current, $versionHistory)) {
			$this->installer->processor()->setError("Updater error", "Plugin " . $id . " does not contain the update required, and cannot continue");
			$this->installer->processor()->showPage("update_error");
		}

		if ($installed == NULL) {
			$this->installer->util()->execPluginCreateTables($id, $basePath);
			return "Plugin " . $id . " installed";
		} else {
			$indexFrom = array_search($installed, $versionHistory) + 1;
			$indexTo = array_search($current, $versionHistory);
			$stepFrom = $installed;

			for ($i = $indexFrom; $i <= $indexTo; $i++) {
				$stepTo = $versionHistory[$i];
				$this->installer->util()->updatePluginVersionStep($id, $stepFrom, $stepTo, $basePath);
				$stepFrom = $stepTo;
			}
			return "Plugin " . $id . " updated to " . $this->versionString($current);
		}
	}

	public function updateSummary() {
		$result = '';

		$systemInstalled = $this->installer->installedVersion();
		$systemCurrent = $this->installer->currentVersion();

		if (strcmp($systemInstalled, $systemCurrent) != 0) {
			$result .= 'Mollify system requires an update to version <b>' . $this->versionString($systemCurrent) . '</b>';
		} else {
			$result .= 'Mollify system is up-to-date.';
		}

		$installedPlugins = array();
		$updatedPlugins = array();
		$allPlugins = $this->installer->processor()->plugins()->getPlugins();

		foreach ($allPlugins as $id => $p) {
			if ($p->version() == NULL) {
				continue;
			}

			$installed = $this->installer->pluginInstalledVersion($id);
			$current = $p->version();

			if ($installed == NULL) {
				$installedPlugins[] = $id;
			} else if (strcmp($installed, $current) != 0) {
				$updatedPlugins[] = $id;
			}
		}

		if (count($installedPlugins) > 0) {
			$result .= '</p><p>Following plugins require installation:<ul>';
			foreach ($installedPlugins as $id) {
				$p = $allPlugins[$id];
				$result .= '<li>' . $id . ' (version <b>' . $this->versionString($p->version()) . '</b>)</li>';
			}
			$result .= '</ul>';
		}
		if (count($updatedPlugins) > 0) {
			$result .= '</p><p>Following plugins require update:<ul>';
			foreach ($updatedPlugins as $id) {
				$p = $allPlugins[$id];
				$result .= '<li>' . $id . ' (version <b>' . $this->versionString($p->version()) . '</b>)</li>';
			}
			$result .= '</ul>';
		}

		return $result;
	}

	public function onError($e) {
		$this->installer->processor()->onError($e);
	}

	public function hasError() {
		return $this->installer->processor()->hasError();
	}

	public function hasErrorDetails() {
		return $this->installer->processor()->hasErrorDetails();
	}

	public function error() {
		return $this->installer->processor()->error();
	}

	public function errorDetails() {
		return $this->installer->processor()->errorDetails();
	}

	public function data($name = NULL) {
		return $this->installer->processor()->data($name);
	}

	public function plugins() {
		return $this->installer->processor()->plugins();
	}

	public function __toString() {
		return "Updater";
	}
}
?>