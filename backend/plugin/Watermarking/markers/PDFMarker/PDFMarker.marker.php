<?php

/**
 * PDFMarker.marker.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL license.
 *
 * License: http://www.mollify.org/license.php
 */

require_once 'fpdf/fpdf.php';
require_once 'fpdi/fpdi.php';

class PDFMarker extends MarkerBase {

	public function mark($src, $dest, $watermarkText) {
		$imgProp = NULL;

		if ($this->getSetting("img_file", NULL) != NULL) {
			$file = $this->getSetting("img_file");
			$imgProp = array(
				"size" => getimagesize($file),
				"file" => $file,
			);
		} else if ($this->getSetting("rotation", NULL) != NULL) {
			$font = $this->getSetting("img_font", dirname(__FILE__) . DIRECTORY_SEPARATOR . 'Arial.ttf');
			if ($font == NULL) {
				throw new ServiceException("INVALID_CONFIGURATION", "Image generation requires font file defined with 'img_font'");
			}

			$imgProp = array(
				"size" => $this->getSetting("img_size", array(800, 200)),
				"font" => $font,
				"font_size" => $this->getSetting("img_font_size", 50),
				"color" => $this->getSetting("color", array(0, 0, 0)),
				"alpha" => $this->getSetting("alpha", 50),
				"rotation" => $this->getSetting("rotation", 45),
			);
			$imageGenerator = $this->env->imageGenerator();
			$imgFile = $imageGenerator->createText($watermarkText, $imgProp["size"], $imgProp["font"], $imgProp["font_size"], $imgProp["color"], $imgProp["alpha"], $imgProp["rotation"]);
			$imgProp["file"] = $imgFile;
			$imgProp["size"] = getimagesize($imgFile);
		}

		$pdf = new WatermarkedPDF($this->getProperties($src, $watermarkText, $imgProp));
		$pdf->mark($dest);
		return TRUE;
	}

	private function getProperties($src, $text, $imgProp = NULL) {
		return array(
			"src" => $src,
			"text" => $text,
			"img" => $imgProp,
			"font" => $this->getSetting("font", array("Arial", "B", 26)),
			"color" => $this->getSetting("color", array(0, 0, 0)),
			"position" => $this->getSetting("position", array("center", "center")),
			"height" => $this->getSetting("height", 10),
			"bottomOffset" => $this->getSetting("bottomOffset", -30),
			"margins" => $this->getSetting("margins", array(0, 0)),
		);
	}
}

class WatermarkedPDF extends FPDI {
	private $opt;
	private $xd = 0;
	private $yd = 0;
	private $wd = 0;
	private $align = "C";
	private $pageSize;

	function __construct($opt) {
		parent::__construct();
		$this->opt = $opt;
	}

	public function mark($dest) {
		$pages = $this->setSourceFile($this->opt["src"]);

		for ($i = 1; $i <= $pages; $i++) {
			$template = $this->importPage($i);
			$size = $this->getTemplateSize($template);

			$this->preparePage(array($size['w'], $size['h']));
			$this->addPage("P", array($size['w'], $size['h']));
			$this->useTemplate($template);

			if (is_array($this->opt["margins"])) {
				$this->setMargins($this->opt["margins"][0], $this->opt["margins"][1]);
			}

			if (!$this->isInFooter()) {
				$this->markBody();
			}
		}

		$this->Output($dest);
	}

	private function preparePage($size) {
		//TODO can pages be different size? otherwise could be done only once

		$this->pageSize = $size;

		// horizontal
		$hp = $this->opt["position"][0];
		if (strcasecmp($hp, 'left') == 0) {
			$this->align = "L";
		} else if (strcasecmp($hp, 'right') == 0) {
			$this->align = "R";
		} else if (strcasecmp($hp, 'center') != 0) {
			if (is_numeric($hp)) {
				$this->xd = $hp;
				if ($this->xd < 0) {
					$this->wd = $size[0] + $this->xd; // width until x mm from right
					$this->xd = 0;
					$this->align = "R";
				} else {
					$this->align = "X";
				}
			}
		}

		//vertical
		$vp = $this->opt["position"][1];
		if (strcasecmp($vp, 'center') == 0) {
			$this->yd = ($size[1] / 2) - $this->opt["height"];
		} else if (strcasecmp($vp, 'top') == 0) {
			$this->yd = 0;
		} else if (strcasecmp($vp, 'bottom') == 0) {
			$this->yd = $this->opt["bottomOffset"];
		} else {
			if (is_numeric($vp)) {
				$this->yd = $vp;
				if ($this->yd < 0) {
					$this->yd = $this->opt["bottomOffset"] + $this->yd;
				}
			}
		}
	}

	private function isInFooter() {
		return (!$this->isImage() and strcasecmp($this->opt["position"][1], 'bottom') == 0);
	}

	private function isImage() {
		return (isset($this->opt["img"]) and $this->opt["img"] != NULL);
	}

	// called manually
	private function markBody() {
		if ($this->isImage()) {
			//$iw = ($this->opt["img"]["size"][0] / 96) * 25.4;//in mm
			//$ih = ($this->opt["img"]["size"][1] / 96) * 25.4;//in mm
			//$x = ($this->pageSize[0]-$iw) / 2;
			//$y = ($this->pageSize[1]-$ih) / 2;
			$x = 0;
			$y = ($this->pageSize[1] - $this->pageSize[0]) / 2;
			$this->Image($this->opt["img"]["file"], $x, $y, $this->pageSize[0]);
			return;
		}

		if (Logging::isDebug()) {
			Logging::logDebug("Body " . Util::array2str(array("x" => $this->xd, "y" => $this->yd, "w" => $this->wd, "align" => $this->align, "opt" => $this->opt)));
		}
		$this->setTextProperties();

		if ($this->align == "X") {
			$this->Text($this->xd, $this->yd, $this->opt["text"]);
		} else {
			$this->setXY($this->xd, $this->yd);
			$this->Cell($this->wd, $this->opt["height"], $this->opt["text"], 0, 0, $this->align);
		}
	}

	private function setTextProperties() {
		$this->SetFont($this->opt["font"][0], $this->opt["font"][1], $this->opt["font"][2]);
		$this->SetTextColor($this->opt["color"][0], $this->opt["color"][1], $this->opt["color"][2]);

	}

	// called automatically by FPDI from AddPage
	function Footer() {
		if (!$this->isInFooter()) {
			return;
		}

		$y = 0 - $this->opt["height"];
		if (Logging::isDebug()) {
			Logging::logDebug("Footer " . Util::array2str(array("x" => $this->xd, "y" => $y, "w" => $this->wd, "align" => $this->align, "opt" => $this->opt)));
		}

		$this->setTextProperties();
		$this->setXY($this->xd, $y);
		$this->Cell($this->wd, $this->opt["height"], $this->opt["text"], 0, 0, ($this->align == "X" ? "L" : $this->align));
	}
}

?>