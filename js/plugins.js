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
        if (console && console.log) console.log("KLOUDSPEAKER DEPRECATION: Item details plugin should not be registered explicitly");
        if (conf) kloudspeaker.plugin.conf.itemdetails = {
            filetypes: conf
        };
        //if (sp) kloudspeaker.App.settings.plugins.itemdetails.filetypes = conf;
        return {
            deprecated: true,

        };
    }

    /**
     *  Item collection plugin
     **/
    kloudspeaker.plugin.ItemCollectionPlugin = function() {
        var that = this;

        this.initialize = function() {};

        this.onStore = function(items) {
            var df = $.Deferred();
            kloudspeaker.ui.dialogs.input({
                title: kloudspeaker.ui.texts.get('pluginItemCollectionStoreDialogTitle'),
                message: kloudspeaker.ui.texts.get('pluginItemCollectionStoreDialogMessage'),
                defaultValue: "",
                yesTitle: kloudspeaker.ui.texts.get('pluginItemCollectionStoreDialogAction'),
                noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
                handler: {
                    isAcceptable: function(n) {
                        return (!!n && n.length > 0);
                    },
                    onInput: function(n) {
                        $.when(that._onStore(items, n)).then(df.resolve, df.reject);
                    }
                }
            });
            return df.promise();
        };

        this._onStore = function(items, name) {
            return kloudspeaker.service.post("itemcollections", {
                items: items,
                name: name
            }).done(function(list) {
                //TODO show message
                that._updateNavBar(list);
            });
        };

        this.onAddItems = function(ic, items) {
            return kloudspeaker.service.post("itemcollections/" + ic.id, {
                items: window.isArray(items) ? items : [items]
            });
        };

        this._removeCollectionItem = function(ic, items) {
            return kloudspeaker.service.del("itemcollections/" + ic.id + "/items", {
                items: window.isArray(items) ? items : [items]
            });
        };

        this._showCollection = function(ic) {
            that._fileView.changeToFolder("ic/" + ic.id);
        };

        this.editCollection = function(ic, done) {
            kloudspeaker.service.get("itemcollections/" + ic.id).done(function(loaded) {
                kloudspeaker.ui.dialogs.tableView({
                    title: kloudspeaker.ui.texts.get('pluginItemCollectionsEditDialogTitle', ic.name),
                    buttons: [{
                        id: "close",
                        title: kloudspeaker.ui.texts.get('dialogClose')
                    }, {
                        id: "remove",
                        title: kloudspeaker.ui.texts.get("pluginItemCollectionsEditDialogRemove"),
                        type: "secondary",
                        cls: "btn-danger secondary"
                    }],
                    onButton: function(btn, h) {
                        h.close();
                        if (btn.id == 'remove') that.removeCollection(ic);
                        done(btn.id == 'remove');
                    },
                    table: {
                        key: "item_id",
                        columns: [{
                            id: "icon",
                            title: "",
                            renderer: function(i, v, $c) {
                                $c.html(i.is_file ? '<i class="icon-file"></i>' : '<i class="icon-folder-close-alt"></i>');
                            }
                        }, {
                            id: "name",
                            title: kloudspeaker.ui.texts.get('fileListColumnTitleName')
                        }, {
                            id: "remove",
                            title: "",
                            type: "action",
                            content: '<i class="icon-trash"></i>'
                        }]
                    },
                    onTableRowAction: function(d, table, id, item) {
                        if (id == "remove") {
                            that._removeCollectionItem(ic, item).done(function() {
                                table.remove(item);
                            });
                        }
                    },
                    onRender: function(d, $c, table) {
                        table.set(loaded.items);
                        $c.removeClass("loading");
                    }
                });
            });
        };

        this._updateNavBar = function(list) {
            if (!list) return;

            that._list = list;
            var navBarItems = [];
            var itemsById = {};
            $.each(list, function(i, ic) {
                itemsById[ic.id] = ic;
                navBarItems.push({
                    title: ic.name,
                    obj: ic,
                    callback: function() {
                        that._showCollection(ic);
                    }
                })
            });
            that._collectionsNav.update(navBarItems);

            var f = that._fileView.getCurrentFolder();
            if (f.type == 'ic') that._collectionsNav.setActive(itemsById[f.id]);
        }

        this.removeCollection = function(ic) {
            return kloudspeaker.service.del("itemcollections/" + ic.id).done(that._updateNavBar);
        };

        this._onShareNavItem = function(ic) {
            if (!kloudspeaker.plugins.exists("plugin-share")) return;
            kloudspeaker.plugins.get("plugin-share").openShares({
                id: "ic_" + ic.id,
                "name": ic.name,
                shareTitle: kloudspeaker.ui.texts.get("pluginItemCollectionShareTitle")
            });
        };

        this._getItemActions = function(ic) {
            var items = [{
                "title-key": "pluginItemCollectionsNavEdit",
                callback: function() {
                    that.editCollection(ic, function(removed) {
                        var f = that._fileView.getCurrentFolder();
                        if (f.type != 'ic' || f.id != ic.id) return;

                        if (removed) that._fileView.openInitialFolder();
                        else that._fileView.refresh();
                    });
                }
            }, {
                "title-key": "pluginItemCollectionsNavRemove",
                callback: function() {
                    that._fileView.openInitialFolder();
                    that.removeCollection(ic);
                }
            }];
            if (kloudspeaker.plugins.exists("plugin-share")) items.push({
                "title-key": "pluginItemCollectionsNavShare",
                callback: function() {
                    that._onShareNavItem(ic);
                }
            });
            return items;
        }

        this._onFileViewInit = function(fv) {
            that._fileView = fv;
            that._fileView.addCustomFolderType("ic", {
                onSelectFolder: function(id) {
                    var df = $.Deferred();
                    kloudspeaker.service.post("itemcollections/" + id + "/data", {
                        rq_data: that._fileView.getDataRequest()
                    }).done(function(r) {
                        that._collectionsNav.setActive(r.ic);

                        var fo = {
                            type: "ic",
                            id: r.ic.id,
                            name: r.ic.name
                        };
                        var data = {
                            items: r.ic.items,
                            ic: r.ic,
                            data: r.data
                        };
                        df.resolve(fo, data);
                    });
                    return df.promise();
                },

                onFolderDeselect: function(f) {
                    that._collectionsNav.setActive(false);
                },

                onRenderFolderView: function(f, data, $h, $tb) {
                    kloudspeaker.dom.template("kloudspeaker-tmpl-fileview-header-custom", {
                        folder: f
                    }).appendTo($h);

                    var opt = {
                        title: function() {
                            return this.data.title ? this.data.title : kloudspeaker.ui.texts.get(this.data['title-key']);
                        }
                    };
                    var $fa = $("#kloudspeaker-fileview-folder-actions");
                    var actionsElement = kloudspeaker.dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                        icon: 'icon-cog',
                        dropdown: true
                    }, opt).appendTo($fa);
                    kloudspeaker.ui.controls.dropdown({
                        element: actionsElement,
                        items: that._getItemActions(data.ic),
                        hideDelay: 0,
                        style: 'submenu'
                    });
                    that._fileView.addCommonFileviewActions($fa);
                }
            });
        };

        this._onFileViewActivate = function($e, h) {
            that._collectionsNav = h.addNavBar({
                title: kloudspeaker.ui.texts.get("pluginItemCollectionsNavTitle"),
                classes: "ic-navbar-item",
                items: [],
                dropdown: {
                    items: that._getItemActions
                },
                onRender: kloudspeaker.ui.draganddrop ? function($nb, $items, objs) {
                    kloudspeaker.ui.draganddrop.enableDrop($items, {
                        canDrop: function($e, e, obj) {
                            if (!obj || obj.type != 'filesystemitem') return false;
                            return true;
                        },
                        dropType: function($e, e, obj) {
                            if (!obj || obj.type != 'filesystemitem') return false;
                            return "copy";
                        },
                        onDrop: function($e, e, obj) {
                            if (!obj || obj.type != 'filesystemitem') return;
                            var item = obj.payload;
                            var ic = objs($e);
                            that.onAddItems(ic, item);
                        }
                    });
                } : false
            });
            kloudspeaker.service.get("itemcollections").done(that._updateNavBar);
        };

        return {
            id: "plugin-itemcollection",
            initialize: that.initialize,
            itemCollectionHandler: function(items) {
                return {
                    actions: [{
                        "title-key": "pluginItemCollectionStore",
                        callback: function() {
                            return that.onStore(items);
                        }
                    }]
                };
            },
            fileViewHandler: {
                onInit: that._onFileViewInit,
                onActivate: that._onFileViewActivate
            }
        };
    }

    /**
     *  Archiver plugin
     **/
    kloudspeaker.plugin.ArchiverPlugin = function() {
        var that = this;

        this.initialize = function() {};

        this.onCompress = function(i, f) {
            if (!i) return;

            var defaultName = '';
            var item = false;
            var items = kloudspeaker.helpers.arrayize(i);
            if (items.length == 1) {
                item = i[0];
            }

            var df = $.Deferred();
            var doCompress = function(folder) {
                if (item) defaultName = item.name + ".zip";

                kloudspeaker.ui.dialogs.input({
                    title: kloudspeaker.ui.texts.get('pluginArchiverCompressDialogTitle'),
                    message: kloudspeaker.ui.texts.get('pluginArchiverCompressDialogMessage'),
                    defaultValue: defaultName,
                    yesTitle: kloudspeaker.ui.texts.get('pluginArchiverCompressDialogAction'),
                    noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
                    handler: {
                        isAcceptable: function(n) {
                            return (!!n && n.length > 0 && (!item || n != item.name));
                        },
                        onInput: function(n) {
                            $.when(that._onCompress(items, folder, n)).then(df.resolve, df.reject);
                        }
                    }
                });
            };
            if (!f) {
                kloudspeaker.ui.dialogs.folderSelector({
                    title: kloudspeaker.ui.texts.get('pluginArchiverCompressDialogTitle'),
                    message: kloudspeaker.ui.texts.get('pluginArchiverCompressSelectFolderDialogMessage'),
                    actionTitle: kloudspeaker.ui.texts.get('ok'),
                    handler: {
                        onSelect: function(folder) {
                            doCompress(folder);
                        },
                        canSelect: function(folder) {
                            return true;
                        }
                    }
                });
            } else {
                doCompress(f);
            }

            return df.promise();
        };

        this.onDownloadCompressed = function(items) {
            //TODO show progress
            return kloudspeaker.service.post("archiver/download", {
                items: items
            }).done(function(r) {
                //TODO remove progress
                kloudspeaker.ui.download(kloudspeaker.service.url('archiver/download/' + r.id, true));
            });
        };

        this._onCompress = function(items, folder, name) {
            return kloudspeaker.service.post("archiver/compress", {
                'items': items,
                'folder': folder,
                'name': name
            }).done(function(r) {
                kloudspeaker.events.dispatch('archiver/compress', {
                    items: items,
                    folder: folder,
                    name: name
                });
                kloudspeaker.events.dispatch('filesystem/update', {
                    folder: folder
                });
            });
        };

        this._onExtract = function(a, folder) {
            return kloudspeaker.service.post("archiver/extract", {
                item: a,
                folder: folder
            }).done(function(r) {
                kloudspeaker.events.dispatch('archiver/extract', {
                    item: a,
                    folder: folder
                });
                kloudspeaker.events.dispatch('filesystem/update', {
                    folder: folder
                });
            });
        };

        this._isArchive = function(item) {
            if (!item.is_file) return false;

            var ext = item.extension.toLowerCase();
            return ext == 'zip'; //TODO get supported extensions from backend
        };

        return {
            id: "plugin-archiver",
            initialize: that.initialize,
            getDownloadCompressedUrl: function(i) {
                var single = false;

                if (!window.isArray(i)) single = i;
                else if (i.length == 1) single = i[0];

                if (single)
                    return kloudspeaker.service.url("archiver/download?item=" + single.id, true);

                return false; //TODO enable downloading array of items?
            },
            itemContextHandler: function(item, ctx, data) {
                var root = (item.id == item.root_id);

                var writable = !root && kloudspeaker.filesystem.hasPermission(item, "filesystem_item_access", "rw");
                var parentWritable = !root && kloudspeaker.filesystem.hasPermission(item.parent_id, "filesystem_item_access", "rw");
                //TODO folder? is this ever something else than parent?
                var folderWritable = !root && ctx.folder && ctx.folder_writable;

                if (parentWritable && that._isArchive(item)) {
                    if (!kloudspeaker.session.plugins.Archiver.actions.extract) return false;

                    return {
                        actions: [{
                            "title-key": "pluginArchiverExtract",
                            callback: function() {
                                return that._onExtract(item)
                            }
                        }]
                    };
                }

                var actions = [];

                if (kloudspeaker.session.plugins.Archiver.actions.download) actions.push({
                    "title-key": "pluginArchiverDownloadCompressed",
                    icon: 'archive',
                    type: "primary",
                    group: "download",
                    callback: function() {
                        that.onDownloadCompressed([item]);
                    }
                });
                if (ctx.folder && folderWritable && kloudspeaker.session.plugins.Archiver.actions.compress) actions.push({
                    "title-key": "pluginArchiverCompress",
                    icon: 'archive',
                    callback: function() {
                        return that.onCompress(item, ctx.folder);
                    }
                });
                return {
                    actions: actions
                };
            },
            itemCollectionHandler: function(items, ctx) {
                var actions = [];
                if (kloudspeaker.session.plugins.Archiver.actions.compress) actions.push({
                    "title-key": "pluginArchiverCompress",
                    icon: 'archive',
                    callback: function() {
                        return that.onCompress(items)
                    }
                });
                if (kloudspeaker.session.plugins.Archiver.actions.download) actions.push({
                    "title-key": "pluginArchiverDownloadCompressed",
                    icon: 'archive',
                    type: "primary",
                    group: "download",
                    callback: function() {
                        return that.onDownloadCompressed(items)
                    }
                });

                return {
                    actions: actions
                };
            }
        };
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
