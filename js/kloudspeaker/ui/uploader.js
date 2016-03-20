define(['kloudspeaker/settings', 'kloudspeaker/service', 'kloudspeaker/dom', 'kloudspeaker/ui', 'kloudspeaker/templates'], function(settings, service, dom, ui, templates) {
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

    t._initUploader = function($input, $dropZone, url, l, s) {
        var started = false;
        var rejected = false;
        var failed = false;

        $input.fileupload($.extend({
            url: url,
            dataType: 'json',
            dropZone: $dropZone,

            add: function(e, data) {
                var that = this;
                var name = data.files[0].name;
                var r = (l.fileStatus && l.fileStatus(name, data.files[0].size));
                if (r) {
                    r.done(function(resumeFrom) {
                        if (resumeFrom && resumeFrom > 0) {
                            console.log("Continue " + resumeFrom);
                            data.uploadedBytes = resumeFrom;
                        }

                        $.blueimp.fileupload.prototype.options.add.call(that, e, data);
                    });
                } else {
                    $.blueimp.fileupload.prototype.options.add.call(that, e, data);
                }
            },

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

    t.initWidget = function($e, o) {
        var $d = dom.template("kloudspeaker-tmpl-uploader-widget").appendTo($e);
        ui.handlers.localize($e);
        var $dropZone = o.dropElement || $e;

        var $input = $d.find("input");
        var s = t._getUploaderSettings();
        if (s["allow-folders"]) $input.attr("directory webkitdirectory mozdirectory");
        t._initUploader($input, $dropZone, o.url, o.handler, s);
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
            var s = t._getUploaderSettings();
            var attributes = '';
            if (s["allow-folders"]) attributes = "directory webkitdirectory mozdirectory";

            var $dndUploader = $('<input type="file" class="kloudspeaker-mainview-uploader-input" name="uploader-html5[]" multiple="multiple"' + attributes + '></input>').appendTo($form);
            t._initUploader($dndUploader, h.dropElement, '', h.handler, s);
            $dndUploader.fileupload('disable');

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
