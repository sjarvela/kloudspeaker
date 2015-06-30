/**
 * plugins.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict";

    kloudspeaker.plugin = {
        conf: {}
    };

    /**
    /* Item details plugin
    /**/
    kloudspeaker.plugin.ItemDetailsPlugin = function(conf) {
        //if (console && console.log) console.log("KLOUDSPEAKER DEPRECATION: Item details plugin should not be registered explicitly");
        if (conf) kloudspeaker.plugin.conf.itemdetails = {
            filetypes: conf
        };
        return {
            deprecated: true
        };
    }

    /**
     *  Item collection plugin
     **/
    kloudspeaker.plugin.ItemCollectionPlugin = function() {
        return {
            deprecated: true
        }
    }

    /**
     *  Archiver plugin
     **/
    kloudspeaker.plugin.ArchiverPlugin = function() {
        return {
            deprecated: true
        }
    }

    /**
    /* File viewer editor plugin
    /**/
    kloudspeaker.plugin.FileViewerEditorPlugin = function() {
        var that = this;

        this.initialize = function() {};

        this.onEdit = function(item, spec) {
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

        this.view = function(item) {
            var doView = function(d) {
                if (!d || !d.plugins || !d.plugins['plugin-fileviewereditor']) return;
                that.onView(item, [], d.plugins['plugin-fileviewereditor']);
            }

            kloudspeaker.filesystem.itemDetails(item, kloudspeaker.plugins.getItemContextRequestData(item)).done(function(d) {
                doView(d);
            });
        };

        this.onView = function(item, all, spec) {
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

        return {
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
        };
    };

    /**
     *  Comment plugin
     **/
    kloudspeaker.plugin.CommentPlugin = function() {
        var that = this;

        this.initialize = function() {
            that._timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));
            kloudspeaker.dom.importCss(kloudspeaker.plugins.url("Comment", "style.css"));
        };

        this.getListCellContent = function(item, data) {
            if (!item.id || item.id.length === 0 || !data || !data["plugin-comment-count"]) return "";
            var counts = data["plugin-comment-count"];

            if (!counts[item.id])
                return "<div id='item-comment-count-" + item.id + "' class='filelist-item-comment-count-none'></div>";

            return "<div id='item-comment-count-" + item.id + "' class='filelist-item-comment-count'>" + counts[item.id] + "</div>";
        };

        this.renderItemContextDetails = function(el, item, ctx, $content, data) {
            $content.addClass("loading");
            kloudspeaker.templates.load("comments-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("Comment", "content.html"))).done(function() {
                $content.removeClass("loading");
                if (data.count === 0) {
                    that.renderItemContextComments(el, item, ctx, [], {
                        element: $content.empty(),
                        contentTemplate: 'comments-template'
                    });
                } else {
                    that.loadComments(item, false, function(item, comments) {
                        that.renderItemContextComments(el, item, ctx, comments, {
                            element: $content.empty(),
                            contentTemplate: 'comments-template'
                        });
                    });
                }
            });
        };

        this.renderItemContextComments = function(el, item, ctx, comments, o) {
            var canAdd = (kloudspeaker.session.user.admin || kloudspeaker.filesystem.hasPermission(item, "comment_item"));
            var $c = kloudspeaker.dom.template(o.contentTemplate, {
                item: item,
                canAdd: canAdd
            }).appendTo(o.element);

            if (canAdd)
                $c.find(".comments-dialog-add").click(function() {
                    var comment = $c.find(".comments-dialog-add-text").val();
                    if (!comment || comment.length === 0) return;
                    that.onAddComment(item, comment, el.close);
                });

            that.updateComments($c.find(".comments-list"), item, comments);
        };

        this.showCommentsBubble = function(item, e, ctx) {
            var bubble = kloudspeaker.ui.controls.dynamicBubble({
                element: e,
                title: item.name,
                container: ctx.container
            });

            kloudspeaker.templates.load("comments-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("Comment", "content.html"))).done(function() {
                that.loadComments(item, true, function(item, comments, permission) {
                    var canAdd = kloudspeaker.session.user.admin || permission == '1';
                    var $c = kloudspeaker.dom.template("comments-template", {
                        item: item,
                        canAdd: canAdd
                    });
                    bubble.content($c);

                    if (canAdd)
                        $c.find(".comments-dialog-add").click(function() {
                            var comment = $c.find(".comments-dialog-add-text").val();
                            if (!comment || comment.length === 0) return;
                            that.onAddComment(item, comment, bubble.close);
                        });

                    that.updateComments($c.find(".comments-list"), item, comments);
                });
            });
        };

        this.loadComments = function(item, permission, cb) {
            kloudspeaker.service.get("comment/" + item.id + (permission ? '?p=1' : '')).done(function(r) {
                cb(item, that.processComments(permission ? r.comments : r), permission ? r.permission : undefined);
            });
        };

        this.processComments = function(comments) {
            var userId = kloudspeaker.session.user_id;

            for (var i = 0, j = comments.length; i < j; i++) {
                comments[i].time = that._timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(comments[i].time));
                comments[i].comment = comments[i].comment.replace(new RegExp('\n', 'g'), '<br/>');
                comments[i].remove = kloudspeaker.session.user.admin || (userId == comments[i].user_id);
            }
            return comments;
        };

        this.onAddComment = function(item, comment, cb) {
            kloudspeaker.service.post("comment/" + item.id, {
                comment: comment
            }).done(function(result) {
                that.updateCommentCount(item, result.count);
                if (cb) cb();
            });
        };

        this.onRemoveComment = function($list, item, id) {
            kloudspeaker.service.del("comment/" + item.id + "/" + id).done(function(result) {
                that.updateCommentCount(item, result.length);
                that.updateComments($list, item, that.processComments(result));
            });
        };

        this.updateCommentCount = function(item, count) {
            var e = document.getElementById("item-comment-count-" + item.id);
            if (!e) return;

            if (count < 1) {
                e.innerHTML = '';
                e.setAttribute('class', 'filelist-item-comment-count-none');
            } else {
                e.innerHTML = count;
                e.setAttribute('class', 'filelist-item-comment-count');
            }
        };

        this.updateComments = function($list, item, comments) {
            $list.removeClass("loading");

            if (comments.length === 0) {
                $list.html("<span class='message'>" + kloudspeaker.ui.texts.get("commentsDialogNoComments") + "</span>");
                return;
            }

            kloudspeaker.dom.template("comment-template", comments).appendTo($list.empty());
            $list.find(".comment-content").hover(
                function() {
                    $(this).addClass("hover");
                },
                function() {
                    $(this).removeClass("hover");
                }
            );
            $list.find(".comment-remove-action").click(function(e) {
                e.preventDefault();
                var comment = $(this).tmplItem().data;
                that.onRemoveComment($list, item, comment.id);
            });
        };

        return {
            id: "plugin-comment",
            initialize: that.initialize,
            fileViewHandler: {
                filelistColumns: function() {
                    return [{
                        "id": "comment-count",
                        "request-id": "plugin-comment-count",
                        "title-key": "",
                        "width": 50,
                        "content": that.getListCellContent,
                        "request": function(parent) {
                            return {};
                        },
                        "on-click": function(item, data, ctx) {
                            that.showCommentsBubble(item, $("#item-comment-count-" + item.id), ctx);
                        }
                    }];
                }
            },
            itemContextHandler: function(item, ctx, data) {
                return {
                    details: {
                        "title-key": "pluginCommentContextTitle",
                        "on-render": function(el, $content, ctx) {
                            that.renderItemContextDetails(el, item, ctx, $content, data);
                        }
                    }
                };
            }
        };
    }

    /**
     *  Dropbox plugin
     **/
    kloudspeaker.plugin.DropboxPlugin = function() {
        return {
            deprecated: true
        };
    }

    /**
     *  Share plugin
     **/
    kloudspeaker.plugin.SharePlugin = function() {
        return {
            deprecated: true
        };
    }

    /**
     *  Registration -plugin published as AMD module
     **/
    kloudspeaker.plugin.RegistrationPlugin = function() {
        return {
            deprecated: true
        };
    }
}(window.jQuery, window.kloudspeaker);
