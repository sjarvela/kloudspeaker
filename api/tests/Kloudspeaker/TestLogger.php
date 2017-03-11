<?php

namespace Kloudspeaker;

require_once "api/Kloudspeaker/Utils.php";

class TestLogger {
    public function debug($msg, $o) {
        echo "DEBUG " . $msg . " " . \Kloudspeaker\Utils::array2str($o) . "\n";
    }

    public function error($msg, $o) {
        echo "ERROR " . $msg . " " . \Kloudspeaker\Utils::array2str($o) . "\n";
    }
}