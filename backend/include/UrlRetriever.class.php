<?php

	/**
	 * UrlRetriever.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class UrlRetriever {
		private $env;
		
		public function __construct($env) {
			$this->env = $env;
		}
		
		public function retrieve($url) {
			if (Logging::isDebug())
				Logging::logDebug("Retrieving [$url]");
			
			$h = curl_init();
			if (!$h)
				throw new ServiceException("INVALID_CONFIGURATION", "Failed to initialize curl: ".curl_errno()." ".curl_error());
			
			if (!curl_setopt($h, CURLOPT_URL, $url)) {
				curl_close($h);
				throw new ServiceException("INVALID_CONFIGURATION", "Failed to initialize curl: ".curl_errno()." ".curl_error());
			}
			
			$tempFile = sys_get_temp_dir().DIRECTORY_SEPARATOR.uniqid('Mollify', true);
			$fh = @fopen($tempFile, "wb");
			if (!$fh) {
				curl_close($h);
				throw new ServiceException("INVALID_CONFIGURATION", "Could not open temporary file for writing: ".$tempFile);
			}
			
			if (!curl_setopt($h, CURLOPT_FILE, $fh) or !curl_setopt($h, CURLOPT_HEADER, 0)) {
				fclose($fh);
				curl_close($h);
				throw new ServiceException("INVALID_CONFIGURATION", "Failed to initialize curl: ".curl_errno()." ".curl_error());
			}
			
			set_time_limit(0);
			$success = curl_exec($h);
			$status = FALSE;
			$errorNo = 0;
			$error = NULL;
			
			if ($success) {
				$status = curl_getinfo($h, CURLINFO_HTTP_CODE);
			} else {
				$errorNo = curl_errno($h);
				$error = curl_error($h);
				Logging::logDebug("Failed to retrieve url: $errorNo $error");
			}
			
			fclose($fh);
			curl_close($h);
			
			if (!$success) {
				if ($errorNo === 6) return array("success" => false, "result" => 404);
				throw new ServiceException("REQUEST_FAILED", $error);
			}
			
			if ($status !== 200) {
				if (file_exists($tempFile)) unlink($tempFile);
				return array("success" => false, "result" => $status);
			}
			
			return array("success" => true, "file" => $tempFile, "stream" => @fopen($tempFile, "rb"), "name" => $this->getName($url));
		}
		
		private function getName($url) {
			$name = $url;
			$pos = strrpos($name, "/");
			if ($pos >= 0) $name = substr($name, $pos+1);
			return strtr($name, "/:?=", "____");
		}
				
		public function __toString() {
			return "UrlRetriever";
		}
	}
?>