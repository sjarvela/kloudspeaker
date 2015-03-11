<?php
/**
* █▒▓▒░ The FlexPaper Project 
* 
* Copyright (c) 2009 - 2011 Devaldi Ltd
* 
* PDF to SWF accessibility file for PHP. Accepts parameters doc and page.
* Executes specified conversion command and returns the specified 
* document/document page upon successful conversion.
*   
* GNU GENERAL PUBLIC LICENSE Version 3 (GPL).
* 
* The GPL requires that you not remove the FlexPaper copyright notices
* from the user interface. 
*  
* Commercial licenses are available. The commercial player version
* does not require any FlexPaper notices or texts and also provides
* some additional features.
* When purchasing a commercial license, its terms substitute this license.
* Please see http://flexpaper.devaldi.com/ for further details.
* 
*/

require_once("../lib/common.php"); 
require_once("../lib/pdf2swf_php5.php");

	$doc=$_GET["doc"];
	$page = "";
	if(isset($_GET["page"]))
		$page = $_GET["page"];
	
	$pos = strpos($doc, "/");
	$configManager = new Config();
	$swfFilePath = $configManager->getConfig('path.swf') . $doc  . $page. ".swf";
	$pdfFilePath = $configManager->getConfig('path.pdf') . $doc;

	if(	!validPdfParams($pdfFilePath,$doc,$page) )
		echo "[Incorrect file specified]";
	else{
		$pdfconv=new pdf2swf();
		$output=$pdfconv->convert($doc,$page);
		if(rtrim($output) === "[Converted]"){
			
			if($configManager->getConfig('allowcache')){
				setCacheHeaders();
			}
			
			if(!$configManager->getConfig('allowcache') || ($configManager->getConfig('allowcache') && endOrRespond())){
				header('Content-type: application/x-shockwave-flash');
				header('Accept-Ranges: bytes');
				header('Content-Length: ' . filesize($swfFilePath));
			
				echo file_get_contents($swfFilePath);
			}
		}else
			echo $output; //error messages etc
	}
?>
