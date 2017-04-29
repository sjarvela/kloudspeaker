<?php
namespace Kloudspeaker;

class Formatters {

    public function __construct($container) {
        $this->container = $container;
        $this->timeFormatter = new TimeFormatter();
    }

    public function getTimeFormatter() {
		return $this->timeFormatter;
    }
}

class TimeFormatter {
	private $internalTimestampFormat = "YmdHis";

	public function formatTimestampInternal($ts) {
		return date($this->internalTimestampFormat, $ts);
	}
}