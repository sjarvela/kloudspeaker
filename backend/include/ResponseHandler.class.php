<?php

/**
 * ResponseHandler.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class ResponseHandler {
	private static $ERRORS = array(
		"UNAUTHORIZED" => array(100, "Unauthorized request", 401),
		"INVALID_REQUEST" => array(101, "Invalid request", 403),
		"FEATURE_DISABLED" => array(104, "Feature disabled", 403),
		"INVALID_CONFIGURATION" => array(105, "Invalid configuration", 403),
		"FEATURE_NOT_SUPPORTED" => array(106, "Feature not supported", 403),
		"AUTHENTICATION_FAILED" => array(107, "Authentication failed", 403),
		"REQUEST_FAILED" => array(108, "Request failed", 403),
		"REQUEST_DENIED" => array(109, "Request denied", 403),

		"INVALID_PATH" => array(201, "Invalid path", 403),
		"FILE_DOES_NOT_EXIST" => array(202, "File does not exist", 403),
		"DIR_DOES_NOT_EXIST" => array(203, "Folder does not exist", 403),
		"FILE_ALREADY_EXISTS" => array(204, "File already exists", 403),
		"DIR_ALREADY_EXISTS" => array(205, "Folder already exists", 403),
		"NOT_A_FILE" => array(206, "Target is not a file", 403),
		"NOT_A_DIR" => array(207, "Target is not a folder", 403),
		"DELETE_FAILED" => array(208, "Could not delete", 403),
		"NO_UPLOAD_DATA" => array(209, "No upload data available", 403),
		"UPLOAD_FAILED" => array(210, "File upload failed", 403),
		"SAVING_FAILED" => array(211, "Saving file failed", 403),
		"INSUFFICIENT_PERMISSIONS" => array(212, "User does not have sufficient permissions", 403),
		"ZIP_FAILED" => array(213, "Creating a zip package failed", 403),
		"NOT_AN_ADMIN" => array(215, "User is not an administrator", 403),
		"UPLOAD_FILE_NOT_ALLOWED" => array(216, "File upload not allowed", 403),

		"UNEXPECTED_ERROR" => array(999, "Unexpected server error", 500),
	);
	private $output;
	private $listeners = array();

	function __construct($output) {
		$this->output = $output;
	}

	public function addListener($l) {
		$this->listeners[] = $l;
	}

	public function download($filename, $type, $mobile, $stream, $size = NULL, $range = NULL) {
		$this->output->downloadBinary($filename, $type, $mobile, $stream, $size, $range);
		$this->notifyResponse();
	}

	public function sendFile($file, $name, $type, $mobile, $size = NULL) {
		$this->output->sendFile($file, $name, $type, $mobile, $size);
		$this->notifyResponse();
	}

	public function send($filename, $type, $stream, $size = NULL) {
		$this->output->sendBinary($filename, $type, $stream, $size);
		$this->notifyResponse();
	}

	public function html($html) {
		$this->output->sendResponse(new Response(200, "html", $html));
		$this->notifyResponse();
	}

	public function success($data) {
		$this->output->sendResponse(new Response(200, "json", $this->getSuccessResponse($data)));
		$this->notifyResponse();
	}

	public function fail($code, $error, $details = NULL) {
		$this->output->sendResponse(new Response(403, "json", $this->getErrorResponse(array($code, $error, 403), $details, $data)));
		$this->notifyResponse();
	}

	public function error($type, $details, $data = NULL) {
		$error = $this->getError($type);
		$this->output->sendResponse(new Response($error[2], "json", $this->getErrorResponse($error, $details, $data)));
		$this->notifyResponse();
	}

	public function redirect($url) {
		$this->output->redirect($url);
	}

	public function unknownServerError($msg) {
		$this->error("UNEXPECTED_ERROR", $msg);
	}

	private function notifyResponse() {
		foreach ($this->listeners as $l) {
			$l->onResponseSent();
		}
	}

	private function getSuccessResponse($data) {
		if (Logging::isDebug()) {
			Logging::logDebug("RESPONSE success " . Util::toString($data));
			return array("result" => $data, "trace" => Logging::getTrace());
		}
		return array("result" => $data);
	}

	private function getError($error) {
		if (is_array($error)) {
			$invalid = (count($error) < 2 or count($error) > 3 or !is_numeric($error[0]));
			if (count($error) == 3 and !is_numeric($error[2])) {
				$invalid = true;
			}

			if ($invalid) {
				return array(0, "Unknown error: " . $error, 403);
			}

			if (count($error) == 2) {
				$error[] = 403;
			}

			return $error;
		}

		if (array_key_exists($error, self::$ERRORS)) {
			return self::$ERRORS[$error];
		} else {
			return array(0, "Unknown error: " . $error, 403);
		}
	}

	private function getErrorResponse($err, $details, $data = NULL) {
		if (Logging::isDebug()) {
			Logging::logDebug("RESPONSE error " . Util::toString($err) . " " . Util::toString($details) . " " . Util::toString($data));
			return array("code" => $err[0], "error" => $err[1], "details" => $details, "data" => $data, "trace" => Logging::getTrace());
		}
		return array("code" => $err[0], "error" => $err[1], "details" => $details, "data" => $data);
	}

	public function __toString() {
		return "ResponseHandler";
	}
}
?>