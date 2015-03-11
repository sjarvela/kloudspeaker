/**
	Copyright (c) 2008- Samuli JŠrvelŠ

	All rights reserved. This program and the accompanying materials
	are made available under the terms of the Eclipse Public License v1.0
	which accompanies this distribution, and is available at
	http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
	this entire header must remain intact.
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