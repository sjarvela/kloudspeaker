define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/plugins'], function(app, settings, plugins) {
    //TODO remove reference to global "kloudspeaker"
    var that = {};

    that.initialize = function() {};

    that.onEdit = function(item, spec) {
        kloudspeaker.ui.dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            title: kloudspeaker.ui.texts.get('fileViewerEditorViewEditDialogTitle'),
            content: '<div class="fileviewereditor-editor-content"></div>',
            buttons: [{
                id: "yes",
                "title": kloudspeaker.ui.texts.get('dialogSave')
            }, {
                id: "no",
                "title": kloudspeaker.ui.texts.get('dialogCancel')
            }],
            "on-button": function(btn, d) {
                if (btn.id == 'no') {
                    d.close();
                    return;
                }
                document.getElementById('editor-frame').contentWindow.onEditorSave(function() {
                    d.close();
                    kloudspeaker.events.dispatch("filesystem/edit", item);
                }, function(c, er) {
                    d.close();
                    return true;
                });
            },
            "on-show": function(h, $d) {
                var $content = $d.find(".fileviewereditor-editor-content");
                var $frm = $('<iframe id="editor-frame" width=\"100%\" height:\"100%\" style=\"width:100%;height:100%;border: none;overflow: none;\" />').attr('src', spec.embedded);
                $content.removeClass("loading").append($frm);
                h.center();
            }
        });
    };

    that.view = function(item) {
        var doView = function(d) {
            if (!d || !d.plugins || !d.plugins['plugin-fileviewereditor']) return;
            that.onView(item, [], d.plugins['plugin-fileviewereditor']);
        }

        kloudspeaker.filesystem.itemDetails(item, kloudspeaker.plugins.getItemContextRequestData(item)).done(function(d) {
            doView(d);
        });
    };

    that.onView = function(item, all, spec) {
        var loaded = {};
        var list = [{
            embedded: spec.view.embedded,
            full: spec.view.full,
            edit: !!spec.edit,
            item: item
        }];
        var init = list[0];
        var visible = false;
        init.init = true;
        var activeItem = false;

        var $lb;
        var $lbc;
        var $i = false;
        var maxW;
        var maxH;
        var isImage = false;
        var resize = function() {
            if (isImage)
                $lb.lightbox('centerImage');
            else
                $lb.lightbox('center');
            /*maxW = ($(window).width() - 100);
            maxH = ($(window).height() - 100);
            $lbc.css({
                "max-width": maxW + "px",
                "max-height": maxH + "px"
            });
            if ($i) {
                $i.css({
                    "max-width": maxW + "px",
                    "max-height": maxH + "px"
                });
            }
            $lb.lightbox('center');*/
        };
        //$(window).resize(resize);
        var load = function(itm) {
            var id = itm.item.id;
            activeItem = itm;

            if (loaded[id]) return;
            $.ajax({
                type: 'GET',
                url: kloudspeaker.helpers.noncachedUrl(itm.embedded)
            }).done(function(data) {
                loaded[id] = true;

                $i = $("#kloudspeaker-fileviewereditor-viewer-item-" + id);
                var $ic = $i.find(".kloudspeaker-fileviewereditor-viewer-item-content");
                $ic.removeClass("loading").html(data.result.html);
                isImage = ($ic.children("img").length > 0);

                if (data.result.size) {
                    var sp = data.result.size.split(';');
                    $("#" + data.result.resized_element_id).css({
                        "width": sp[0] + "px",
                        "height": sp[1] + "px"
                    });
                }

                // if img, wait until it is loaded
                /*var $img = $ic.find('img:first');
                if ($img.length > 0) {
                    $img.one('load', function() {
                        var w = $img.width();
                        if (!data.result.size && w > 0)
                            $img.css({
                                "width": w + "px",
                                "height": $img.height() + "px"
                            });
                        resize();
                    });
                } else {
                    resize();
                }*/


                resize();
                if (!visible) {
                    $lb.lightbox('show');
                    visible = true;
                    $(window).resize(resize);
                }
            });
        };

        var $v = kloudspeaker.dom.template("kloudspeaker-tmpl-fileviewereditor-popup", {
            items: list
        }, {
            content: function(i) {
                return i.content;
            }
        }).appendTo($("body"));

        var onHide = function() {
            $v.remove();
        };

        $lb = $v.lightbox({
            backdrop: true,
            //resizeToFit: true,
            show: false,
            onHide: onHide
        });
        kloudspeaker.ui.process($lb, ["localize"]);

        $lb.find("button.close").click(function() {
            $lb.lightbox('hide');
        });
        $lbc = $lb.find(".carousel-inner");

        var $c = $v.find(".carousel").carousel({
            interval: false
        }).on('slid', function() {
            var $active = $v.find(".kloudspeaker-fileviewereditor-viewer-item.active");
            load($active.tmplItem().data);
        });
        $c.find(".carousel-control").click(function() {
            if ($(this).hasClass("left")) $c.carousel('prev');
            else $c.carousel('next');
        });
        var $tools = $c.find(".kloudspeaker-fileviewereditor-viewer-tools");
        $tools.find(".kloudspeaker-fileviewereditor-viewer-item-viewinnewwindow").click(function() {
            $lb.lightbox('hide');
            kloudspeaker.ui.window.open(activeItem.full);
        });
        $tools.find(".kloudspeaker-fileviewereditor-viewer-item-edit").click(function() {
            $lb.lightbox('hide');
            that.onEdit(item, spec.edit); //TODO activeItem
        });
        load(init);
    };

    plugins.register({
        id: "plugin-fileviewereditor",
        initialize: that.initialize,
        view: that.view,
        canView: function(itemDetails) {
            if (!itemDetails) {
                var df = $.Deferred();
                kloudspeaker.filesystem.itemDetails(item, kloudspeaker.plugins.getItemContextRequestData(item)).done(function(d) {
                    df.resolve(!!(d.plugins && d.plugins["plugin-fileviewereditor"] && d.plugins["plugin-fileviewereditor"].view));
                });
                return df;
            }
            return !!(itemDetails.plugins && itemDetails.plugins["plugin-fileviewereditor"] && itemDetails.plugins["plugin-fileviewereditor"].view);
        },
        itemContextHandler: function(item, ctx, data) {
            if (!data) return false;

            var previewerAvailable = !!data.preview;
            var viewerAvailable = !!data.view;
            var editorAvailable = !!data.edit;

            var result = {
                details: false,
                actions: []
            };
            if (previewerAvailable) {
                result.details = {
                    "title-key": "pluginFileViewerEditorPreview",
                    "on-render": function(el, $content) {
                        $content.empty().addClass("loading");

                        $.ajax({
                            type: 'GET',
                            url: data.preview
                        }).done(function(r) {
                            $content.removeClass("loading").html(r.result.html);
                        });
                    }
                };
            }

            if (viewerAvailable) {
                result.actions.push({
                    id: 'pluginFileViewerEditorView',
                    "title-key": 'pluginFileViewerEditorView',
                    type: "primary",
                    callback: function() {
                        that.onView(item, [], data);
                    }
                });
            }
            if (editorAvailable && kloudspeaker.filesystem.hasPermission(item, "filesystem_item_access", "rw")) {
                result.actions.push({
                    id: 'pluginFileViewerEditorView',
                    "title-key": 'pluginFileViewerEditorEdit',
                    type: "primary",
                    callback: function() {
                        that.onEdit(item, data.edit);
                    }
                });
            }
            return result;
        }
    });
});
