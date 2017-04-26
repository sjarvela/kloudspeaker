<?php

class ImageGenerator {
	private $env;
	private $imagick;

	function __construct($env) {
		$this->env = $env;
		//$this->fontPath = $this->env->settings()->setting("fonts_dir"); //dirname(__FILE__) . DIRECTORY_SEPARATOR;
		$this->imagick = class_exists("Imagick");
	}

	public function isTypeSupported($type) {
		if (strcasecmp("tiff", $type) === 0) return $this->imagick;
		return FALSE;
	}

	public function convertToPng($src, $type, $sendToOutput = FALSE) {
		if ($type == "tiff") {
			$img = new Imagick();
			$img->readImage($src);
			$img->setImageFormat("png24");

			if ($sendToOutput) {
				header("Content-type: image/png");
				echo $img;
				$img->clear();
				$img->destroy();
				return;
			}
			return $img;
		}
	}

	public function createText($text, $size, $font, $fontSize, $textColor, $textAlpha, $rotation) {
		$target = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . uniqid('Kloudspeaker', true) . '.png';

		$this->render_text_on_gd_image(
			$target,
			$size,
			$text,
			$font,
			$fontSize,
			$textColor,
			$textAlpha,
			$rotation
		);

		return $target;
	}

	function render_text_on_gd_image($target, $imgSize, $text, $font, $size, $color, $opacity, $rotation) {
		$im = imagecreatetruecolor($imgSize[0], $imgSize[1]);
		//$black = imagecolorallocate($im, 0, 0, 0);
		//imagecolortransparent($im, $black);
		imagealphablending($im, false);
		imagesavealpha($im, true);

		$transparent = imagecolorallocatealpha($im, 255, 255, 255, 127);
		imagefill($im, 0, 0, $transparent);
		//imagecolortransparent($im, $transparent);

		$source_width = $imgSize[0];
		$source_height = $imgSize[1];
		$bb = $this->imagettfbbox_fixed($size, 0, $font, $text);

		$x = $bb[0] + ($imgSize[0] / 2) - ($bb[4] / 2) - 5;
		$y = $bb[1] + ($imgSize[1] / 2) - ($bb[5] / 2) - 5;
		$alpha_color = imagecolorallocatealpha(
			$im,
			$color[0],
			$color[1],
			$color[2],
			127 * (100 - $opacity) / 100
		);
		imagettftext($im, $size, 0, $x, $y, $alpha_color, $font, $text);

		if ($rotation != 0) {
			$new = imagerotate($im, $rotation, $transparent);
			imagealphablending($new, false);
			imagesavealpha($new, true);
			imagedestroy($im);
			$im = $new;
		}

		/*$newWidth = imagesx($tmpImage);
		$newHt = imagesy($tmpImage);
		imagecopymerge($image, $tmpImage, $x - $newWidth + $dropdown, $y - $newHt, 0, 0, $newWidth, $newHt, 100);*/

		imagepng($im, $target);
		imagedestroy($im);
		return TRUE;
	}

	function imagettfbbox_fixed($size, $rotation, $font, $text) {
		$bb = imagettfbbox($size, 0, $font, $text);
		$aa = deg2rad($rotation);
		$cc = cos($aa);
		$ss = sin($aa);
		$rr = array();
		for ($i = 0; $i < 7; $i += 2) {
			$rr[$i + 0] = round($bb[$i + 0] * $cc + $bb[$i + 1] * $ss);
			$rr[$i + 1] = round($bb[$i + 1] * $cc - $bb[$i + 0] * $ss);
		}
		return $rr;
	}

	/*function imageTextRotated($image, $size, $angle, $x, $y, $inColor, $fontfile, $text, $info = array()) {

$bbox = imageftbbox($size, 0, $fontfile, $text, $info);
$dropdown = $size * 0.3;
$xsize = abs($bbox[2]-$bbox[0]);
$ysize = abs($bbox[5]-$bbox[3]);
$tmpImage = imagecreatetruecolor($xsize * 1.25, $ysize * 1.25);// need the extra space to accommodate risers and descenders
$transparent = imagecolorallocate($tmpImage, 255, 255, 154);
if (!$transparent) {
error_log("Color allocate failed");
}
imagecolortransparent($tmpImage, $transparent);
if (!imagefill($tmpImage, 0, $ysize, $transparent)) {
error_log("Fill failed");
}
$rgb = imagecolorsforindex($image, $inColor);
$color = imagecolorexact($tmpImage, $rgb['red'], $rgb['green'], $rgb['blue']);
if ($color == -1) {
$color = imagecolorallocate($tmpImage, $rgb['red'], $rgb['green'], $rgb['blue']);

if (!$color) {
error_log("Color allocate 2 failed");
}
}

$newbbox = imagefttext($tmpImage, $size, 0, 0, $ysize * 1.0, $color, $fontfile, $text, $info);
$tmpImage = imagerotate($tmpImage, $angle, $transparent);
$newWidth = imagesx($tmpImage);
$newHt = imagesy($tmpImage);
imagecopymerge($image, $tmpImage, $x - $newWidth + $dropdown, $y - $newHt, 0, 0, $newWidth, $newHt, 100);

//        Highlight the desired starting point (baseline) with a green dot:
//        $green = imagecolorallocate($image, 0, 251, 0);
//        imagefilledellipse($image, $x, $y, 10, 10, $green);
imagedestroy($tmpImage);
}*/

}

?>