<?php
/**
* █▒▓▒░ The FlexPaper Project 
* 
* Copyright (c) 2009 - 2011 Devaldi Ltd
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
	function arrayToString($result_array) {
		reset($result_array);
		$s="";
		$itemNo=0;
		$total=count($result_array);
		while ($array_cell=each($result_array)) {
			$itemNo++;
			if ($itemNo<30) {
				$s .= $array_cell['value'] . chr(10) ;
			} else if ($itemNo>$total-30) {
				$s .= $array_cell['value'] . chr(10) ;
			} else if ($itemNo==30) {
				$s .= chr(10) . "... ... ... ... ... ... ... ... ... ..." . chr(10) . chr(10);
			}
		}
		return $s;
	}
	
	function getLastWord($myStr) {
		$compare=1;
		$i=0;
		while(($compare!=0)&&($i+strlen($myStr)>0)) {
			$i--;
			$s1=substr($myStr,$i,1);
			$compare=strcmp($s1,"/");
		}
		return substr($myStr,strlen($myStr)+$i);
	}

	function removeFileName($myStr) {
		$end=getLastWord($myStr);
		$root=substr($myStr,0,strlen($myStr)-strlen($end));
		if ($root{strlen($root)-1}!="/") $root=$root . "/";
		return $root;
	}
	
	function validSwfParams($path,$doc,$page){
		return !(	basename(realpath($path)) != $doc  . $page . ".swf" ||
				 	substr_compare($doc, 'pdf', -3, 3) === -1 ||
				 	strlen($doc) > 255 ||
				 	strlen($page) > 255
				);	
	}
	
	function validPdfParams($path,$doc,$page){
		return !(	basename(realpath($path)) != $doc ||
				 	strlen($doc) > 255 ||
				 	strlen($page) > 255
				);	
	}
	
	function setCacheHeaders(){
		header("Cache-Control: private, max-age=10800, pre-check=10800");
		header("Pragma: private");
		header("Expires: " . date(DATE_RFC822,strtotime(" 2 day")));	
	}
	
	function endOrRespond(){
		if(isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])){
		  header('Last-Modified: '.$_SERVER['HTTP_IF_MODIFIED_SINCE'],true,304);
		  return false;
		}else{
			return true;
		}
	}
	
	function getForkCommandStart(){
		if(	PHP_OS == "WIN32" || PHP_OS == "WINNT"	)
			return "START ";
		else
			return "";
	}
	
	function getForkCommandEnd(){
		if(	PHP_OS == "WIN32" || PHP_OS == "WINNT"	)
			return "";
		else
			return " >/dev/null 2>&1 &";
	}
	
	function getTotalPages($PDFPath) {
		$stream = @fopen($PDFPath, "r");
		$PDFContent = @fread ($stream, filesize($PDFPath));
		if(!$stream || !$PDFContent)
		    return false;
		    
		$firstValue = 0;
		$secondValue = 0;
		if(preg_match("/\/N\s+([0-9]+)/", $PDFContent, $matches)) {
		    $firstValue = $matches[1];
		}
		 
		if(preg_match_all("/\/Count\s+([0-9]+)/s", $PDFContent, $matches))
		{
		    $secondValue = max($matches[1]);
		}
		return (($secondValue != 0) ? $secondValue : max($firstValue, $secondValue));
	}
?>