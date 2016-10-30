<?php

	/**
	 * OutputHandler.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class OutputHandler {
		private $codes = array(  
			100 => 'Continue',  
			101 => 'Switching Protocols',  
			200 => 'OK',  
			201 => 'Created',  
			202 => 'Accepted',  
			203 => 'Non-Authoritative Information',  
			204 => 'No Content',  
			205 => 'Reset Content',  
			206 => 'Partial Content',  
			300 => 'Multiple Choices',  
			301 => 'Moved Permanently',  
			302 => 'Found',  
			303 => 'See Other',  
			304 => 'Not Modified',  
			305 => 'Use Proxy',  
			306 => '(Unused)',  
			307 => 'Temporary Redirect',  
			400 => 'Bad Request',  
			401 => 'Unauthorized',  
			402 => 'Payment Required',  
			403 => 'Forbidden',  
			404 => 'Not Found',  
			405 => 'Method Not Allowed',  
			406 => 'Not Acceptable',  
			407 => 'Proxy Authentication Required',  
			408 => 'Request Timeout',  
			409 => 'Conflict',  
			410 => 'Gone',  
			411 => 'Length Required',  
			412 => 'Precondition Failed',  
			413 => 'Request Entity Too Large',  
			414 => 'Request-URI Too Long',  
			415 => 'Unsupported Media Type',  
			416 => 'Requested Range Not Satisfiable',  
			417 => 'Expectation Failed',  
			500 => 'Internal Server Error',  
			501 => 'Not Implemented',  
			502 => 'Bad Gateway',  
			503 => 'Service Unavailable',  
			504 => 'Gateway Timeout',  
			505 => 'HTTP Version Not Supported'  
        );
        
        private $defaultMimeTypes = array(
			'ogg' => 'audio/ogg',
			'oga' => 'audio/ogg',
			'mov' => 'video/quicktime',
			'mp3' => 'audio/mpeg',
			'm4a' => 'audio/mp4',
			'webma' => 'audio/webm',
			'mp4' => 'video/mp4',
			'aif' => "audio/x-aiff",
			'wav' => "audio/wav",
			'divx' => "video/divx",
			'avi' => "video/divx",
			'mkv' => "video/divx",
			'pdf' => "application/pdf",
			'jpg' => 'image/jpeg',
			"doc" => "application/msword",
			"html" => "text/html",
			"svg" => "image/svg+xml",
			"docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"xls" => "application/vnd.ms-excel",
			"xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"ppt" => "application/vnd.ms-powerpoint",
			"pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        );
        
        private $mimeTypes;
        private $supportOutputBuffer;
        
		function __construct($mimeTypes = array(), $supportOutputBuffer = FALSE) {
			$this->mimeTypes = $mimeTypes;
			$this->supportOutputBuffer = $supportOutputBuffer;
		}
		
		public function sendResponse($response) {
			header($this->getStatus($response));
			header("Cache-Control: no-store, no-cache, must-revalidate");
			
			$data = $response->data();
			if (!$data) return;
			
			if ($response->type() === 'json') {
				header('Content-type: application/json');
				$encoded = json_encode($data);
				header('Content-length: '.strlen($encoded));
				echo $encoded;
			} else {
				header('Content-type: text/html');
				echo $data;
			}
		}
		
		public function downloadBinary($filename, $type, $mobile, $stream, $size = NULL, $range = NULL) {
			$streamSize = NULL;
			if ($range) {
				$start = $range[0];
				$end = $range[1];
				$rsize = $range[2];
				
				if ($start > 0 || $end < ($size - 1))
					header('HTTP/1.1 206 Partial Content');
				header("Cache-Control:");
				header("Cache-Control: public");
				header('Accept-Ranges: bytes');
				header('Content-Range: bytes '.$start.'-'.$end.'/'.$rsize);
				header('Content-Length: '.($end - $start + 1));
				$streamSize = $rsize;
			} else {
				$this->sendDownloadHeaders($filename, $type, $mobile, $size);
				if ($size) $streamSize = $size;
			}

			Logging::logDebug("Sending $filename ($size)");			
			if ($range) fseek($stream, $range[0]);

			$this->doSendBinary($stream, $streamSize);
		}
		
		private function sendDownloadHeaders($filename, $type, $mobile, $size) {
			header('Content-Disposition: attachment; filename*=UTF-8\'\''.rawurlencode($filename));
			if ($size) header("Content-Length: ".$size);
			header("Pragma: public");
			header("Expires: 0");
			header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
			header("Cache-Control: private",false);
			header("Content-Type: application/octet-stream");
			header("Content-Transfer-Encoding: binary");
			if ($type) header("Content-Type: ".$this->getMime(trim(strtolower($type))));
			if (!$mobile) {
				header("Content-Type: application/force-download");	// mobile browsers don't like these
				header("Content-Type: application/download");
			}
		}

		public function sendBinary($filename, $type, $stream, $size = NULL, $range = NULL) {
			$streamSize = NULL;
			if ($range) {
				$start = $range[0];
				$end = $range[1];
				$rsize = $range[2];
				
				if ($start > 0 || $end < ($size - 1))
					header('HTTP/1.1 206 Partial Content');
				header("Cache-Control:");
				header("Cache-Control: public");
				header('Accept-Ranges: bytes');
				header('Content-Range: bytes '.$start.'-'.$end.'/'.$rsize);
				header('Content-Length: '.($end - $start + 1));
				$streamSize = $rsize;
			} else {
				if ($size) {
					header("Content-Length: ".$size);
					$streamSize = $size;
				}
			}
			header("Content-Type: ".$this->getMime(trim(strtolower($type))));
			
			if ($range) fseek($stream, $range[0]);
			$this->doSendBinary($stream, $streamSize);
		}

		public function sendFile($file, $name, $type, $mobile, $size = NULL) {			
			$handle = @fopen($file, "rb");
			if (!$handle)
				throw new ServiceException("REQUEST_FAILED", "Could not open file for reading: ".$file);
			
			$this->sendDownloadHeaders($name, $type, $mobile, $size);
			$this->doSendBinary($handle);
		}
				
		private function doSendBinary($stream, $size = NULL) {
			//if ($this->supportOutputBuffer) ob_start();
			$chunk = 1024;
			$count = 0;

			while (!feof($stream)) {
				$count = $count + 1;
				$read = $chunk;
				//TODO if size, make sure only up to size is read

				set_time_limit(0);
				echo fread($stream, $read);
				if ($this->supportOutputBuffer and ob_get_length() != FALSE) @ob_flush();
				flush();
			}
			fclose($stream);
			Logging::logDebug("Sent $count chunks");
		}

		public function redirect($url) {
			header("Location: ".$url);
		}
				
		private function getStatus($response) {
			return 'HTTP/1.1 '.$response->code().' '.$this->codes[$response->code()];
		}
		
		private function getMime($type) {
			if (array_key_exists($type, $this->mimeTypes)) return $this->mimeTypes[$type];
			if (array_key_exists($type, $this->defaultMimeTypes)) return $this->defaultMimeTypes[$type];
			return 'application/octet-stream';
		}
		
		public function __toString() {
			return "OutputHandler";
		}
	}
?>