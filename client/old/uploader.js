/**
 * uploader.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */
 
!function($, kloudspeaker) {

	"use strict";

	kloudspeaker.HTML5Uploader = function() {
		var t = this;
		
		// prevent default file drag&drop		
		$(document).bind('drop dragover', function (e) {
			e.preventDefault();
			return false;
		});
		
		/*this.open = function(folder) {
			var $d = kloudspeaker.dom.template("kloudspeaker-tmpl-uploader-dlg");
			kloudspeaker.ui.dialogs.custom({
				element: $d,
				"title-key": 'fileUploadDialogTitle',
				buttons: [
					{ id:0, "title-key": "upload" },
					{ id:1, "title-key": "cancel" }
				],
				"on-button": function(btn, dlg) {
					if (btn.id == 1)
						dlg.close();
					else t.onUpload($d, dlg,folder);
				},
				"on-show": function(dlg) { t.onOpen($d, dlg, folder); }
			});
		};*/
		
		/*this.onOpen = function($d, dlg, folder) {
			//var $form = $d.find(".kloudspeaker-uploader-form");//.attr("action", );
			var $input = $d.find("input").on('change', function() {
				//if (!this.files || this.files.length == 0) return;
				//if (this.files.length == 1) alert(this.files[0].name);
				//else alert(this.files.length);
			}).fileupload({
				url: kloudspeaker.service.url("filesystem/"+folder.id+'/files/'),
				dataType: 'json',
				dropZone: $d.find(".kloudspeaker-uploader").bind("dragover", function(e) { e.stopPropagation(); }),
				drop: function (e, data) {
					alert('Dropped: ' + data.files.length);	//TODO
				},
				progressall: function (e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					console.log(progress);	//TODO
				},
				done: function(e, data) {
	
				}
			});	
		};*/
		
		this._getUploaderSettings = function() {
			return kloudspeaker.settings["html5-uploader"] || {};	
		};
		
		this._initDropZoneEffects = function($e) {
			$e.bind('dragover', function (e) {
				e.stopPropagation();
				var dropZone = $e
				var timeout = window.dropZoneTimeout;
				
				if (!timeout)
					dropZone.addClass('in');
				else
					clearTimeout(timeout);

				if (e.target === dropZone[0])
					dropZone.addClass('hover');
				else
					dropZone.removeClass('hover');

				window.dropZoneTimeout = setTimeout(function () {
					window.dropZoneTimeout = null;
					dropZone.removeClass('in hover');
				}, 100);
			});
		};
		
		this.initWidget = function($e, o) {
			var $d = kloudspeaker.dom.template("kloudspeaker-tmpl-uploader-widget").appendTo($e);
			kloudspeaker.ui.handlers.localize($e);
			var $dropZone = o.dropElement || $e;
			var started = false;
			var rejected = false;
			var failed = false;
			var l = o.handler;
			
			var $input = $d.find("input");
			if (t._getUploaderSettings()["allow-folders"]) $input.attr("directory webkitdirectory mozdirectory");
			$input.fileupload($.extend({
				url: o.url,
				dataType: 'json',
				dropZone: $dropZone,
				/*add: function (e, data) {
					if (l.isUploadAllowed && !l.isUploadAllowed(data.originalFiles)) return false;
					
					if (!started && l.start)
						l.start(data.originalFiles, function() {
							data.submit();
						});
					else
						data.submit();
					started = true;
				},*/
				submit: function (e, data) {
					if (started && rejected) return;
					//console.log("submit");
					//console.log(data);

					if (!started) {
						started = true;
						failed = false;
						rejected = false;
						
						if (l.isUploadAllowed && !l.isUploadAllowed(data.originalFiles)) {
							rejected = true;
							return false;
						}
						
						if (l.start)
							l.start(data.originalFiles, function() {});
					}
				},
				progressall: function (e, data) {
					if (!l.progress) return;
					
					var progress = parseInt(data.loaded / data.total * 100, 10);
					//console.log(progress + "%");
					l.progress(progress, data.bitrate || false);
				},
				done: function(e, data) {
					//console.log("done");
					//if (l.finished) l.finished();
					//started = false;
				},
				stop: function() {
					//console.log("all done");
					started = false;
					rejected = false;
					var wasFailed = failed;
					failed = false;
					if (!wasFailed && l.finished) l.finished();
				},
				fail: function(e, data) {
					failed = true;
					var r = data.response();
					var error = null;
					if (r && r.jqXHR) {
						var response = r.jqXHR.responseText;
						if (response) error = JSON.parse(response);
					}
					if (l.failed) l.failed(data.files, error);
					//started = false;
				}
			}, t._getUploaderSettings()));
			
			if ($dropZone) t._initDropZoneEffects($dropZone);
		};
		
		return {
			initUploadWidget : function($e, o) {
				kloudspeaker.templates.load("kloudspeaker-uploader", kloudspeaker.templates.url("uploader.html")).done(function() {
					t.initWidget($e, o);
				});
			},
			initDragAndDropUploader : function(h) {
				var $p = h.container;
				var $container = $('<div style="width: 0px; height: 0px; overflow: hidden;"></div>').appendTo($p);
				var $form = $('<form enctype="multipart/form-data"></form>').appendTo($container);
				var started = false;
				var rejected = false;
				var failed = false;
				var attributes = '';
				if (t._getUploaderSettings()["allow-folders"]) attributes = "directory webkitdirectory mozdirectory";
				var $dndUploader = $('<input type="file" class="kloudspeaker-mainview-uploader-input" name="uploader-html5[]" multiple="multiple"' + attributes + '></input>').appendTo($form).fileupload($.extend({
					url: '',
					dataType: 'json',
					dropZone: h.dropElement,
					/*add: function (e, data) {
						if (h.handler.isUploadAllowed && !h.handler.isUploadAllowed(data.originalFiles)) return false;
						
						if (!started && h.handler.start)
							h.handler.start(data.originalFiles, function() {
								data.submit();
							});
						else
							data.submit();
						started = true;
					},*/
					submit: function (e, data) {
						if (started && rejected) return;
						//console.log("submit");
						//console.log(data);

						if (!started) {
							started = true;
							rejected = false;
							failed = false;
							
							if (h.handler.isUploadAllowed && !h.handler.isUploadAllowed(data.originalFiles)) {
								rejected = true;
								return false;
							}
							
							//$.each(data.originalFiles, function(i, f) { totalSize += f.size; });
							
							if (h.handler.start)
								h.handler.start(data.originalFiles, function() {});
						}
					},
					progressall: function (e, data) {
						if (!h.handler.progress) return;
						
						var progress = parseInt(data.loaded / data.total * 100, 10);
						//console.log(progress + "%");
						h.handler.progress(progress, data.bitrate || false);
					},
					done: function(e, data) {
						//console.log("done " + data.files.length);
						//console.log(data);						
					},
					stop: function() {
						//console.log("all done");
						started = false;
						rejected = false;
						var wasFailed = failed;
						failed = false;
						if (!wasFailed && h.handler.finished) h.handler.finished();
					},
					fail: function(e, data) {
						failed = true;
						var r = data.response();
						var error = null;
						if (r && r.jqXHR) {
							var response = r.jqXHR.responseText;
							if (response) error = JSON.parse(response);
						}
						if (h.handler.failed) h.handler.failed(data.files, error);
					}
				}, t._getUploaderSettings())).fileupload('disable');
				t._initDropZoneEffects(h.dropElement);
				
				return {
					destroy: function() {
						if ($dndUploader) $dndUploader.fileupload("destroy");
						$dndUploader = false;
					},
					setUrl : function(url) {
						if (!$dndUploader) return;
						if (!url) {
							$dndUploader.fileupload('disable');
							return;
						}
						$dndUploader.fileupload('enable').fileupload('option', 'url', url);
					}
				};
			}
		};
	}
}(window.jQuery, window.kloudspeaker);