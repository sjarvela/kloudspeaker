/**
 * install.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

jQuery.fn.exists = function(){ return ($(this).length > 0); }

function action(action) {
	setData("action", action);
	$('#page-data').submit();
}

function phase(phase) {
	setData("phase", phase);
	$('#page-data').submit();
}

function setData(name, value) {
	var item = '#page-data > input[name="'+name+'"]';
	if ($(item).exists()) {
		$(item).val(value);
	} else {
		$("#page-data").append('<input type="hidden" name="'+name+'" value="'+value+'">');
	}
}

function openUrl(url) {
	window.location = url;
}