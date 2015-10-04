define(['kloudspeaker/settings', 'kloudspeaker/dom', 'kloudspeaker/ui', 'kloudspeaker/templates'], function(settings, dom, ui, templates) {
	//TODO make widget etc
    var t = {};

    // prevent default file drag&drop		
    $(document).bind('drop dragover', function(e) {
        e.preventDefault();
        return false;
    });

    t._getUploaderSettings = function() {
        return settings["html5-uploader"] || {};
    };

    t._initDropZoneEffects = function($e) {
        $e.bind('dragover', function(e) {
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

            window.dropZoneTimeout = setTimeout(function() {
                window.dropZoneTimeout = null;
                dropZone.removeClass('in hover');
            }, 100);
        });
    };

    t.initWidget = function($e, o) {
        var $d = dom.template("kloudspeaker-tmpl-uploader-widget").appendTo($e);
        ui.handlers.localize($e);
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
            submit: function(e, data) {
                if (started && rejected) return;
                //console.log("submit");
                //console.log(data);

                if (!started) {
                    e.stopPropagation();

                    started = true;
                    failed = false;
                    rejected = false;

                    if (l.isUploadAllowed && !l.isUploadAllowed(data.originalFiles)) {
                        rejected = true;
                        return false;
                    }

                    if (l.start)
                        l.start(data.originalFiles, function() {}, function() {
                            data.jqXHR.abort();
                        });
                }
            },
            progressall: function(e, data) {
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
                if (data.errorThrown == 'abort') {
                    if (l.aborted) l.aborted(data.files);
                    return;
                }
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
        initUploadWidget: function($e, o) {
            templates.load("kloudspeaker-uploader", templates.url("uploader.html")).done(function() {
                t.initWidget($e, o);
            });
        },
        initDragAndDropUploader: function(h) {
            var $p = h.container;
            var $container = $('<div class="uploader-container" style="width: 0px; height: 0px; overflow: hidden;"></div>').appendTo($p);
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
                submit: function(e, data) {
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
                            h.handler.start(data.originalFiles, function() {}, function() {
                                data.jqXHR.abort();
                            });
                    }
                },
                progressall: function(e, data) {
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
                    if (data.errorThrown == 'abort') {
                        if (h.handler.aborted) h.handler.aborted(data.files);
                        return;
                    }
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
                    if (!$dndUploader) return;
                    var $container = $dndUploader.closest(".uploader-container");
                    $dndUploader.fileupload("destroy");
                    $container.remove();
                    $dndUploader = false;
                },
                setUrl: function(url) {
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
});
