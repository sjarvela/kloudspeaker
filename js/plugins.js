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

    kloudspeaker.plugin = {};

    kloudspeaker.plugin.Core = function() {
        var that = this;

        var doDelete = function(items) {
            var many = (window.isArray(items) && items.length > 1);
            var single = many ? null : (window.isArray(items) ? items[0] : items);

            var title = many ? kloudspeaker.ui.texts.get("deleteManyConfirmationDialogTitle") : (single.is_file ? kloudspeaker.ui.texts.get("deleteFileConfirmationDialogTitle") : kloudspeaker.ui.texts.get("deleteFolderConfirmationDialogTitle"));
            var msg = many ? kloudspeaker.ui.texts.get("confirmDeleteManyMessage", items.length) : kloudspeaker.ui.texts.get(single.is_file ? "confirmFileDeleteMessage" : "confirmFolderDeleteMessage", [single.name]);

            var df = $.Deferred();
            kloudspeaker.ui.dialogs.confirmation({
                title: title,
                message: msg,
                callback: function() {
                    $.when(kloudspeaker.filesystem.del(items)).then(df.resolve, df.reject);
                }
            });
            return df.promise();
        };

        return {
            id: "plugin-core",
            itemContextHandler: function(item, ctx, data) {
                var root = (item.id == item.root_id);
                var writable = kloudspeaker.filesystem.hasPermission(item, "filesystem_item_access", "rw");
                var movable = writable && !root;
                var deletable = !root && kloudspeaker.filesystem.hasPermission(item, "filesystem_item_access", "rwd");
                var parentWritable = !root && kloudspeaker.filesystem.hasPermission(item.parent_id, "filesystem_item_access", "rw");

                var actions = [];
                if (item.is_file) {
                    actions.push({
                        'title-key': 'actionDownloadItem',
                        icon: 'download',
                        type: "primary",
                        group: "download",
                        callback: function() {
                            kloudspeaker.ui.download(kloudspeaker.filesystem.getDownloadUrl(item));
                        }
                    });
                    actions.push({
                        title: '-'
                    });
                } else {
                    if (writable && kloudspeaker.settings["file-view"]["create-empty-file-action"])
                        actions.push({
                            'title-key': 'actionCreateEmptyFileItem',
                            icon: 'file',
                            callback: function() {
                                kloudspeaker.ui.dialogs.input({
                                    message: kloudspeaker.ui.texts.get('actionCreateEmptyFileMessage'),
                                    title: kloudspeaker.ui.texts.get('actionCreateEmptyFileTitle'),
                                    defaultValue: "",
                                    yesTitle: kloudspeaker.ui.texts.get('ok'),
                                    noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
                                    handler: {
                                        isAcceptable: function(v) {
                                            if (!v || v.trim().length === 0) return false;
                                            if (/[\/\\]|(\.\.)/.test(v)) return false;
                                            return true;

                                        },
                                        onInput: function(v) {
                                            kloudspeaker.filesystem.createEmptyFile(item, v);
                                        }
                                    }
                                });
                            }
                        });
                }

                actions.push({
                    'title-key': 'actionCopyItem',
                    icon: 'copy',
                    callback: function() {
                        return kloudspeaker.filesystem.copy(item);
                    }
                });
                if (parentWritable)
                    actions.push({
                        'title-key': 'actionCopyItemHere',
                        icon: 'copy',
                        callback: function() {
                            return kloudspeaker.filesystem.copyHere(item);
                        }
                    });

                if (movable) {
                    actions.push({
                        'title-key': 'actionMoveItem',
                        icon: 'mail-forward',
                        callback: function() {
                            return kloudspeaker.filesystem.move(item);
                        }
                    });
                    actions.push({
                        'title-key': 'actionRenameItem',
                        icon: 'pencil',
                        callback: function() {
                            return kloudspeaker.filesystem.rename(item);
                        }
                    });
                    if (deletable)
                        actions.push({
                            'title-key': 'actionDeleteItem',
                            icon: 'trash',
                            callback: function() {
                                return doDelete(item);
                            }
                        });
                }
                return {
                    actions: actions
                };
            },
            itemCollectionHandler: function(items) {
                var roots = false;
                $.each(items, function(i, itm) {
                    var root = (itm.id == itm.root_id);
                    if (root) {
                        roots = true;
                        return false;
                    }
                });
                var actions = [{
                    'title-key': 'actionCopyMultiple',
                    icon: 'copy',
                    callback: function() {
                        return kloudspeaker.filesystem.copy(items);
                    }
                }];

                if (!roots) {
                    actions.push({
                        'title-key': 'actionMoveMultiple',
                        icon: 'mail-forward',
                        callback: function() {
                            return kloudspeaker.filesystem.move(items);
                        }
                    });
                    actions.push({
                        'title-key': 'actionDeleteMultiple',
                        icon: 'trash',
                        callback: function() {
                            return doDelete(items);
                        }
                    });
                }

                return {
                    actions: actions
                };
            }
        };
    }

    /**
    /* Item details plugin
    /**/
    kloudspeaker.plugin.ItemDetailsPlugin = function(conf, sp) {
        var that = this;
        that.formatters = {};
        that.typeConfs = false;

        this.initialize = function() {
            that.fileSizeFormatter = new kloudspeaker.ui.formatters.ByteSize(new kloudspeaker.ui.formatters.Number(2, false, kloudspeaker.ui.texts.get('decimalSeparator')));
            that.timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));
            /*if (sp) {
                for (var i=0; i<sp.length;i++)
                    that.addDetailsSpec(sp[i]);
            }*/
            if (conf) {
                that.typeConfs = {};

                for (var t in conf) {
                    var parts = t.split(",");
                    var c = conf[t];
                    for (var i = 0; i < parts.length; i++) {
                        var p = parts[i].trim();
                        if (p.length > 0)
                            that.typeConfs[p] = c;
                    }
                }
            }
        };

        /*this.addDetailsSpec = function(s) {
            if (!s || !s.key) return;
            that.specs[s.key] = s;
        }*/

        this.getApplicableSpec = function(item) {
            var ext = (item.is_file && item.extension) ? item.extension.toLowerCase().trim() : "";
            if (ext.length === 0 || !that.typeConfs[ext]) {
                ext = item.is_file ? "[file]" : "[folder]";
                if (!that.typeConfs[ext])
                    return that.typeConfs["*"];
            }
            return that.typeConfs[ext];
        }

        this.renderItemContextDetails = function(el, item, $content, data) {
            $content.addClass("loading");
            kloudspeaker.templates.load("itemdetails-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("ItemDetails", "content.html"))).done(function() {
                $content.removeClass("loading");
                that.renderItemDetails(el, item, {
                    element: $content.empty(),
                    data: data
                });
            });
        };

        this.renderItemDetails = function(el, item, o) {
            var s = that.getApplicableSpec(item);
            var groups = that.getGroups(s, o.data);

            var result = [];
            for (var i = 0, j = groups.length; i < j; i++) {
                var g = groups[i];
                result.push({
                    key: g,
                    title: that.getGroupTitle(g),
                    rows: that.getGroupRows(g, s, o.data)
                });
            }

            /*var data = [];
            for (var k in s) {
                var rowSpec = s[k];
                var rowData = o.data[k];
                if (!rowData) continue;
                
                data.push({key:k, title:that.getTitle(k, rowSpec), value: that.formatData(k, rowData)});
            }*/
            kloudspeaker.dom.template("itemdetails-template", {
                groups: result
            }).appendTo(o.element);
        };

        this.getGroups = function(s, d) {
            var groups = [];
            for (var k in s) {
                var spec = s[k];
                var data = d[k];
                if (!data) continue;

                var g = 'file';
                if (k == 'exif' || that.formatters[k]) g = k;

                if (groups.indexOf(g) < 0)
                    groups.push(g);
            }
            return groups;
        };

        this.getGroupTitle = function(g) {
            if (that.formatters[g]) {
                var f = that.formatters[g];
                if (f.groupTitle) return f.groupTitle;
                if (f["group-title-key"]) return kloudspeaker.ui.texts.get(f["group-title-key"]);
            }
            if (g == 'file') return kloudspeaker.ui.texts.get('fileItemDetailsGroupFile');
            if (g == 'exif') return kloudspeaker.ui.texts.get('fileItemDetailsGroupExif');
            return '';
        };

        this.getGroupRows = function(g, s, d) {
            if (that.formatters[g])
                return that.formatters[g].getGroupRows(s[g], d[g]);
            if (g == 'exif') return that.getExifRows(s[g], d[g]);

            // file group rows
            var rows = [];
            for (var k in s) {
                if (k == 'exif' || that.formatters[k]) continue;
                var spec = s[k];

                var rowData = d[k];
                if (!rowData && k == 'metadata-modified') {
                    rowData = d['metadata-created'];
                }
                if (!rowData) {
                    continue;
                }

                rows.push({
                    title: that.getFileRowTitle(k, s[k]),
                    value: that.formatFileData(k, rowData)
                });
            }
            return rows;
        };

        this.getFileRowTitle = function(dataKey, rowSpec) {
            if (rowSpec.title) return rowSpec.title;
            if (rowSpec["title-key"]) return kloudspeaker.ui.texts.get(rowSpec["title-key"]);

            if (dataKey == 'name') return kloudspeaker.ui.texts.get('fileItemContextDataName');
            if (dataKey == 'size') return kloudspeaker.ui.texts.get('fileItemContextDataSize');
            if (dataKey == 'path') return kloudspeaker.ui.texts.get('fileItemContextDataPath');
            if (dataKey == 'extension') return kloudspeaker.ui.texts.get('fileItemContextDataExtension');
            if (dataKey == 'last-modified') return kloudspeaker.ui.texts.get('fileItemContextDataLastModified');
            if (dataKey == 'image-size') return kloudspeaker.ui.texts.get('fileItemContextDataImageSize');
            if (dataKey == 'metadata-created') return kloudspeaker.ui.texts.get('fileItemContextDataCreated');
            if (dataKey == 'metadata-modified') return kloudspeaker.ui.texts.get('fileItemContextDataLastModified');

            /*if (that.specs[dataKey]) {
                var spec = that.specs[dataKey];
                if (spec.title) return spec.title;
                if (spec["title-key"]) return kloudspeaker.ui.texts.get(spec["title-key"]);
            }*/
            return dataKey;
        };

        this.formatFileData = function(key, data) {
            if (key == 'size') return that.fileSizeFormatter.format(data);
            if (key == 'last-modified') return that.timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(data));
            if (key == 'image-size') return kloudspeaker.ui.texts.get('fileItemContextDataImageSizePixels', [data]);
            if (key == 'metadata-created') return that.timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(data.at)) + "&nbsp;<i class='icon-user'/>&nbsp;" + data.by.name;
            if (key == 'metadata-modified') return that.timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(data.at)) + "&nbsp;<i class='icon-user'/>&nbsp;" + data.by.name;

            if (that.specs[key]) {
                var spec = that.specs[key];
                if (spec.formatter) return spec.formatter(data);
            }

            return data;
        };

        this.getExifRows = function(spec, data) {
            var rows = [];
            for (var section in data) {
                var html = '';
                var first = true;
                var count = 0;
                for (var key in data[section]) {
                    var v = that.formatExifValue(section, key, data[section][key]);
                    if (!v) continue;

                    html += '<tr id="exif-row-' + section + '-' + key + '" class="' + (first ? 'exif-row-section-first' : 'exif-row') + '"><td class="exif-key">' + key + '</td><td class="exif-value">' + v + '</td></tr>';
                    first = false;
                    count++;
                }

                if (count > 0)
                    rows.push({
                        title: section,
                        value: '<table class="exif-section-' + section + '">' + html + "</table>"
                    });
            }
            return rows;
        };

        this.formatExifValue = function(section, key, value) {
            if (section == 'FILE' && key == 'SectionsFound') return false;
            //TODO format values?
            return value;
        };

        return {
            id: "plugin-itemdetails",
            initialize: that.initialize,
            itemContextRequestData: function(item) {
                if (!that.typeConfs) return false;
                var spec = that.getApplicableSpec(item);
                if (!spec) return false;

                var data = [];
                for (var k in spec)
                    data.push(k);
                return data;
            },
            itemContextHandler: function(item, ctx, data) {
                if (!data || !that.typeConfs) return false;
                var spec = that.getApplicableSpec(item);
                if (!spec) return false;

                return {
                    details: {
                        "title-key": "pluginItemDetailsContextTitle",
                        "on-render": function(el, $content) {
                            that.renderItemContextDetails(el, item, $content, data);
                        }
                    }
                };
            }
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
                        $("#" + data.result["resized_element_id"]).css({
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
     *  Permission plugin
     **/
    kloudspeaker.plugin.PermissionsPlugin = function() {
        var that = this;
        this._permissionTypes = false;

        this.initialize = function() {
            kloudspeaker.events.addEventHandler(function(e) {
                if (!that._permissionTypes && kloudspeaker.session.user) that._permissionTypes = kloudspeaker.session.data.permission_types
            }, "session/start");
            that._pathFormatter = new kloudspeaker.ui.formatters.FilesystemItemPath();
        };

        this._formatPermissionName = function(p) {
            var name = kloudspeaker.ui.texts.get('permission_' + p.name);
            if (p.subject == null && that._permissionTypes.filesystem[p.name])
                return kloudspeaker.ui.texts.get('permission_default', name);
            return name;
        };

        this._formatPermissionValue = function(name, val) {
            var values = that._getPermissionValues(name);
            if (values)
                return kloudspeaker.ui.texts.get('permission_' + name + '_value_' + val);
            return kloudspeaker.ui.texts.get('permission_value_' + val);
        };

        this._getPermissionValues = function(name) {
            return that._permissionTypes.values[name];
        };

        this.editItemPermissions = function(item) {
            var modificationData = {
                "new": [],
                "modified": [],
                "removed": []
            };
            var originalValues = [];
            var $content = false;

            kloudspeaker.ui.dialogs.custom({
                resizable: true,
                initSize: [600, 400],
                title: kloudspeaker.ui.texts.get('pluginPermissionsEditDialogTitle', item.name),
                content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor", {
                    item: item
                }),
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
                    if (modificationData["new"].length === 0 && modificationData.modified.length === 0 && modificationData.removed.length === 0)
                        return;

                    kloudspeaker.service.put("permissions/list", modificationData).done(d.close).fail(d.close);
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#kloudspeaker-pluginpermissions-editor-content");
                    var $subContents = $content.find(".kloudspeaker-pluginpermissions-editor-subcontent").hide();
                    var $activeSubContent = false;
                    var activeTab = 0;
                    var selectedPermission = false;

                    h.center();

                    kloudspeaker.service.get("configuration/users?g=1").done(function(l) {
                        var users = that.processUserData(l);
                        var names = that._permissionTypes.keys.filesystem;
                        var init = 'filesystem_item_access';
                        var onPermissionsModified = function() {
                            var info = (modificationData["new"].length > 0 || modificationData.modified.length > 0 || modificationData.removed.length > 0) ? "<i class='icon-exclamation-sign '/>&nbsp;" + kloudspeaker.ui.texts.get('pluginPermissionsEditDialogUnsaved') : false;
                            h.setInfo(info);
                        };
                        var getPermissionKey = function(p) {
                            return p.user_id + ":" + p.subject + ":" + p.name;
                        };
                        var changes = {
                            addNew: function(p) {
                                if (!p.isnew) return;
                                modificationData["new"].push(p);
                                onPermissionsModified();
                            },
                            remove: function(p) {
                                if (p.isnew) {
                                    modificationData["new"].remove(modificationData["new"].indexOf(p));
                                } else {
                                    modificationData.removed.push(p);
                                }
                                onPermissionsModified();
                            },
                            update: function(p, v) {
                                if (!p.isnew) {
                                    var key = getPermissionKey(p);
                                    // store original value
                                    if (!originalValues[key]) originalValues[key] = p.value;

                                    modificationData.removed.remove(p);

                                    var mi = modificationData.modified.indexOf(p);

                                    if (originalValues[key] == v) {
                                        if (mi >= 0) modificationData.modified.remove(mi);
                                    } else {
                                        if (mi < 0) modificationData.modified.push(p);
                                    }
                                }
                                p.value = v;
                                onPermissionsModified();
                            },
                            getNew: function(name) {
                                return $.grep(modificationData["new"], function(p) {
                                    return p.name == name;
                                });
                            },
                            findRemoved: function(userId, subject, permissionName) {
                                for (var i = 0, j = modificationData.removed.length; i < j; i++) {
                                    var d = modificationData.removed[i];
                                    if (d.user_id == userId && d.subject == subject && d.name == permissionName)
                                        return d;
                                }
                                return false;
                            }
                        };

                        var removeAndUpdate = function(list) {
                            var byKey = {};
                            $.each(list, function(i, p) {
                                byKey[getPermissionKey(p)] = p;
                            });
                            //remove
                            for (var i = 0, j = modificationData.removed.length; i < j; i++) {
                                var rp = modificationData.removed[i];
                                var rpk = getPermissionKey(rp);
                                if (rpk in byKey) list.remove(list.indexOf(byKey[rpk]));
                            }
                            //update
                            for (var k = 0, l = modificationData.modified.length; k < l; k++) {
                                var mp = modificationData.modified[k];
                                var mpk = getPermissionKey(mp);
                                if (mpk in byKey) byKey[mpk].value = mp.value;
                            }
                        };

                        var addNewUserAndGroupPermissions = function(list, user, permissionName) {
                            var usersAndGroupsAndItemDefault = [];
                            $.each(list, function(i, p) {
                                if (p.user_id !== 0 && p.user_id != user.id && user.group_ids.indexOf(p.user_id) < 0) return false;
                                usersAndGroupsAndItemDefault.push(p);
                            });
                            $.each(usersAndGroupsAndItemDefault, function(i, p) {
                                list.remove(p);
                            });
                            var newList = [];
                            $.each(changes.getNew(permissionName), function(i, p) {
                                if (p.subject != item.id) return;
                                if (p.user_id === 0 || p.user_id == user.id || user.group_ids.indexOf(p.user_id) >= 0) usersAndGroupsAndItemDefault.push(p);
                            });
                            newList = usersAndGroupsAndItemDefault.concat(list);
                            var indx = function(p) {
                                var i = 0;

                                if (p.subject == item.id) i = 20;
                                else if (p.subject != null && p.subject !== "") i = 10;

                                if (p.user_id == user.id) i = i + 2;
                                else if (user.group_ids.indexOf(p.user_id) >= 0) i = i + 1;

                                return i;
                            };
                            newList = newList.sort(function(a, b) {
                                return indx(b) - indx(a);
                            });

                            return newList;
                        }

                        var activateTab = function(i) {
                            $("#kloudspeaker-pluginpermissions-editor-tab > li").removeClass("active").eq(i).addClass("active");
                            $activeSubContent = $subContents.hide().eq(i).show();
                            activeTab = i;

                            if (i === 0) onActivateItemPermissions($activeSubContent);
                            else onActivateUserPermissions($activeSubContent);
                        };

                        var onChangePermission = function(sel) {
                            selectedPermission = sel;
                            activateTab(activeTab);
                        };

                        kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-permission-name", {
                            onChange: onChangePermission,
                            formatter: function(name) {
                                return kloudspeaker.ui.texts.get('permission_' + name);
                            },
                            values: names,
                            value: init
                        });

                        $("#kloudspeaker-pluginpermissions-editor-tab > li").click(function() {
                            var i = $(this).addClass("active").index();
                            activateTab(i);
                        });

                        var onActivateItemPermissions = function($sc) {
                            $sc.addClass("loading");

                            that.loadPermissions(item, selectedPermission).done(function(p) {
                                $sc.removeClass("loading");

                                var permissions = p.permissions.slice(0);
                                removeAndUpdate(permissions);
                                permissions = permissions.concat(changes.getNew(selectedPermission));
                                that.initItemPermissionEditor(changes, item, selectedPermission, permissions, users);
                            }).fail(h.close);
                        };

                        var onActivateUserPermissions = function($sc) {
                            var resetUserPermissions = function() {
                                $("#kloudspeaker-pluginpermissions-editor-user-related-permissions").hide();
                                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html("");
                            }
                            resetUserPermissions();

                            var onChangeUser = function(sel) {
                                resetUserPermissions();
                                if (!sel) return;

                                if (sel.user_type == 'a') {
                                    $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(kloudspeaker.ui.texts.get("pluginPermissionsUserPermissionsAdmin"));
                                    return;
                                }
                                $sc.addClass("loading");

                                kloudspeaker.service.get("permissions/user/" + sel.id + "?e=1&subject=" + item.id + "&name=" + selectedPermission).done(function(p) {
                                    $sc.removeClass("loading");

                                    var permissions = p.permissions.slice(0);
                                    removeAndUpdate(permissions);
                                    permissions = addNewUserAndGroupPermissions(permissions, sel, selectedPermission);
                                    that.initUserPermissionInspector(changes, sel, item, selectedPermission, permissions, p.items, users);
                                }).fail(h.close);
                            };

                            kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-permission-user", {
                                onChange: onChangeUser,
                                none: kloudspeaker.ui.texts.get("pluginPermissionsEditNoUser"),
                                values: users.users,
                                title: "name"
                            });
                        };

                        onChangePermission(init);
                    }).fail(h.close);
                }
            });
        };

        this.processUserData = function(l) {
            var userData = {
                users: [],
                groups: [],
                all: [],
                usersById: {}
            };
            for (var i = 0, j = l.length; i < j; i++) {
                var u = l[i];
                if (u.is_group == "0") {
                    userData.users.push(u);
                    userData.all.push(u);
                    userData.usersById[u.id] = u;
                } else {
                    userData.groups.push(u);
                    userData.all.push(u);
                    userData.usersById[u.id] = u;
                }
            }
            return userData;
        };

        this.loadPermissions = function(item, name, users) {
            return kloudspeaker.service.get("permissions/list?subject=" + item.id + (name ? "&name=" + name : "") + (users ? "&u=1" : ""));
        };

        this.initUserPermissionInspector = function(changes, user, item, permissionName, relatedPermissions, items, userData) {
            var updateEffectivePermission = function() {
                var ep = false;
                if (relatedPermissions.length > 0) ep = relatedPermissions[0].value;
                if (ep) {
                    $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(kloudspeaker.ui.texts.get('pluginPermissionsEffectiveUserPermission', that._formatPermissionValue(permissionName, ep)));
                    $("#kloudspeaker-pluginpermissions-editor-user-related-permissions").show();
                } else {
                    var values = that._getPermissionValues(permissionName);
                    $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(kloudspeaker.ui.texts.get('pluginPermissionsNoEffectiveUserPermission', that._formatPermissionValue(permissionName, values ? values[0] : '0')));
                }
            }
            updateEffectivePermission();
            if (relatedPermissions.length === 0) return;

            var isGroup = function(id) {
                return (id != '0' && userData.usersById[id].is_group != "0");
            };
            var onRemove = function(permission) {
                changes.remove(permission);
                relatedPermissions.remove(permission);
                updateEffectivePermission();
            };

            var $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-editor-user-permission-list", {
                key: "user_id",
                onRow: function($r, i) {
                    if (isGroup(i.user_id)) $r.addClass("group");
                },
                columns: [{
                    id: "user_id",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsEditColUser'),
                    renderer: function(i, v, $c) {
                        if (v == '0' && i.subject === '') return;
                        if (v == '0') {
                            $c.html("<em>" + kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission') + "</em>");
                            return;
                        }
                        $c.html(userData.usersById[v].name).addClass("user");
                    }
                }, {
                    id: "value",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                    formatter: function(item, k) {
                        return that._formatPermissionValue(permissionName, k);
                    }
                }, {
                    id: "subject",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsEditColSource'),
                    renderer: function(i, s, $c) {
                        var subject = items[s];
                        if (!subject) {
                            var n = kloudspeaker.ui.texts.get("permission_system_default");
                            if (i.user_id != '0') {
                                var user = userData.usersById[i.user_id];
                                n = kloudspeaker.ui.texts.get((user.is_group == '1' ? "permission_group_default" : "permission_user_default"));
                            }
                            $c.html("<em>" + n + "</em>");
                        } else {
                            if (subject.id == item.id) {
                                $c.html('<i class="icon-file-alt"/>&nbsp;' + kloudspeaker.ui.texts.get('pluginPermissionsEditColItemCurrent'));
                            } else {
                                var level = Math.max(item.path.count("/"), item.path.count("\\")) - Math.max(subject.path.count("/"), subject.path.count("\\")) + 1;
                                $c.html('<i class="icon-file-alt"/>&nbsp;' + kloudspeaker.ui.texts.get('pluginPermissionsEditColItemParent', level));
                            }
                            $c.tooltip({
                                placement: "bottom",
                                html: true,
                                title: that._pathFormatter.format(subject),
                                trigger: "hover",
                                container: "#kloudspeaker-pluginpermissions-editor-user-related-permissions"
                            });
                        }
                    }
                }, {
                    id: "remove",
                    title: "",
                    type: "action",
                    content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
                }],
                onRowAction: function(id, permission) {
                    changes.remove(permission);
                    relatedPermissions.remove(permission);
                    $list.remove(permission);
                    updateEffectivePermission();
                }
            });
            $list.add(relatedPermissions);
        };

        this.initItemPermissionEditor = function(changes, item, permissionName, permissions, userData) {
            var $list;

            var permissionValues = that._getPermissionValues(permissionName);
            var isGroup = function(id) {
                return (id != '0' && userData.usersById[id].is_group != "0");
            };
            var onAddOrUpdate = function(user, permissionVal) {
                var userVal = $list.findByKey(user.id);
                if (userVal) {
                    changes.update(userVal, permissionVal);
                    $list.update(userVal);
                } else {
                    var removed = changes.findRemoved(user.id, item.id, permissionName);
                    if (removed) {
                        // if previously deleted, move it to modified
                        removed.permission = permissionVal;
                        changes.update(removed);
                        $list.add(removed);
                    } else {
                        // not modified or deleted => create new
                        var p = {
                            "user_id": user.id,
                            "subject": item.id,
                            "name": permissionName,
                            "value": permissionVal,
                            isnew: true
                        };
                        changes.addNew(p);
                        $list.add(p);
                    }
                }
            };

            $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-editor-permission-list", {
                key: "user_id",
                onRow: function($r, i) {
                    if (isGroup(i.user_id)) $r.addClass("group");
                },
                columns: [{
                    id: "user_id",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsEditColUser'),
                    renderer: function(i, v, $c) {
                        var name = (v != '0' ? userData.usersById[v].name : kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission'));
                        $c.html(name).addClass("user");
                    }
                }, {
                    id: "value",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                    type: "select",
                    options: permissionValues || ['0', '1'],
                    formatter: function(item, k) {
                        return that._formatPermissionValue(item.name, k);
                    },
                    onChange: function(item, p) {
                        changes.update(item, p);
                    },
                    cellClass: "permission"
                }, {
                    id: "remove",
                    title: "",
                    type: "action",
                    content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
                }],
                onRowAction: function(id, permission) {
                    changes.remove(permission);
                    $list.remove(permission);
                }
            });

            $list.add(permissions);
            var $newUser = kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-new-user", {
                none: kloudspeaker.ui.texts.get('pluginPermissionsEditNoUser'),
                title: "name",
                onCreate: function($o, i) {
                    if (isGroup(i.id)) $o.addClass("group");
                }
            });
            $newUser.add({
                name: kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission'),
                id: 0,
                is_group: 0
            });
            $newUser.add(userData.users);
            $newUser.add(userData.groups);

            var $newPermission = kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-new-permission", {
                values: permissionValues || ['0', '1'],
                none: kloudspeaker.ui.texts.get('pluginPermissionsEditNoPermission'),
                formatter: function(p) {
                    return that._formatPermissionValue(permissionName, p);
                }
            });

            var resetNew = function() {
                $newUser.select(false);
                $newPermission.select(false);
            };
            resetNew();

            $("#kloudspeaker-pluginpermissions-editor-new-add").unbind("click").click(function() {
                var selectedUser = $newUser.selected();
                if (!selectedUser) return;
                var selectedPermission = $newPermission.selected();
                if (!selectedPermission) return;

                onAddOrUpdate(selectedUser, selectedPermission);
                resetNew();
            });
        };

        this.renderItemContextDetails = function(el, item, $content) {
            kloudspeaker.dom.template("kloudspeaker-tmpl-permission-context").appendTo($content);
            kloudspeaker.ui.process($content, ["localize"]);

            that.loadPermissions(item, "filesystem_item_access", true).done(function(p) {
                var userData = that.processUserData(p.users);

                $("#kloudspeaker-pluginpermissions-context-content").removeClass("loading");

                var $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-context-permission-list", {
                    key: "user_id",
                    columns: [{
                        id: "user_id",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsEditColUser'),
                        formatter: function(i, v) {
                            return (v != '0' ? userData.usersById[v].name : kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission'));
                        }
                    }, {
                        id: "value",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                        formatter: function(i, v) {
                            return that._formatPermissionValue(i.name, v);
                        }
                    }]
                });
                $list.add(p.permissions);
                $("#kloudspeaker-pluginpermissions-context-edit").click(function() {
                    el.close();
                    that.editItemPermissions(item);
                });
            }).fail(function(e) {
                el.close();
            });
        };

        this.onActivateConfigView = function($c, cv) {
            kloudspeaker.service.get("configuration/users?g=1").done(function(l) {
                var users = that.processUserData(l);

                var allTypeKeys = that._permissionTypes.keys.all;
                var $optionName, $optionUser, $optionSubject;
                var queryItems = [];

                var getQueryParams = function(i) {
                    var name = $optionName.get();
                    var user = $optionUser.get();
                    var subject = $optionSubject.get();

                    var params = {};
                    if (name) params.name = name;
                    if (user) params.user_id = user.id;
                    if (subject) {
                        params.subject_type = subject;

                        if (subject == 'filesystem_item' || subject == 'filesystem_child') {
                            if (selectedSubjectItem)
                                params.subject_value = selectedSubjectItem.id;
                            else
                                params.subject_type = null;
                        }
                    }

                    return params;
                };

                var refresh = function() {
                    cv.showLoading(true);
                    listView.table.refresh().done(function() {
                        cv.showLoading(false);
                    });
                };

                var removePermissions = function(list) {
                    return kloudspeaker.service.del("permissions/list/", {
                        list: list
                    });
                }

                var listView = new kloudspeaker.view.ConfigListView($c, {
                    actions: [{
                        id: "action-item-permissions",
                        content: '<i class="icon-file"></i>',
                        tooltip: kloudspeaker.ui.texts.get('configAdminPermissionsEditItemPermissionsTooltip'),
                        callback: function(sel) {
                            kloudspeaker.ui.dialogs.itemSelector({
                                title: kloudspeaker.ui.texts.get('configAdminPermissionsEditItemPermissionsTitle'),
                                message: kloudspeaker.ui.texts.get('configAdminPermissionsEditItemPermissionsMessage'),
                                actionTitle: kloudspeaker.ui.texts.get('ok'),
                                allRoots: true,
                                handler: {
                                    onSelect: function(i) {
                                        that.editItemPermissions(i);
                                    },
                                    canSelect: function(f) {
                                        return true;
                                    }
                                }
                            });
                        },
                    }, {
                        id: "action-remove",
                        content: '<i class="icon-trash"></i>',
                        cls: "btn-danger",
                        depends: "table-selection",
                        callback: function(sel) {
                            kloudspeaker.ui.dialogs.confirmation({
                                title: kloudspeaker.ui.texts.get("configAdminPermissionsRemoveConfirmationTitle"),
                                message: kloudspeaker.ui.texts.get("configAdminPermissionsRemoveConfirmationMessage", [sel.length]),
                                callback: function() {
                                    removePermissions(sel).done(refresh);
                                }
                            });
                        }
                    }, {
                        id: "action-edit-generic",
                        content: '<i class="icon-globe"></i>',
                        tooltip: kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermissionsAction'),
                        callback: function() {
                            that.editGenericPermissions();
                        }
                    }, {
                        id: "action-refresh",
                        content: '<i class="icon-refresh"></i>',
                        callback: refresh
                    }],
                    table: {
                        id: "config-permissions-list",
                        key: "id",
                        narrow: true,
                        hilight: true,
                        remote: {
                            path: "permissions/query",
                            paging: {
                                max: 50
                            },
                            queryParams: getQueryParams,
                            onData: function(r) {
                                queryItems = r.items;
                            },
                            onLoad: function(pr) {
                                $c.addClass("loading");
                                pr.done(function(r) {
                                    $c.removeClass("loading");
                                });
                            }
                        },
                        defaultSort: {
                            id: "time",
                            asc: false
                        },
                        columns: [{
                            type: "selectrow"
                        }, {
                            id: "name",
                            title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionName'),
                            sortable: true,
                            formatter: function(item, name) {
                                return that._formatPermissionName(item);
                            }
                        }, {
                            id: "value",
                            title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                            sortable: true,
                            formatter: function(item, k) {
                                return that._formatPermissionValue(item.name, k);
                            }
                        }, {
                            id: "user_id",
                            title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionUser'),
                            sortable: true,
                            formatter: function(item, u) {
                                if (!u || u == "0")
                                    return "";
                                return users.usersById[u].name;
                            }
                        }, {
                            id: "subject",
                            title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionSubject'),
                            formatter: function(item, s) {
                                if (!s) return "";
                                if ((that._permissionTypes.keys.filesystem.indexOf(item.name) >= 0) && queryItems[s]) {
                                    var itm = queryItems[s];
                                    if (itm) return that._pathFormatter.format(itm);
                                }
                                return s;
                            }
                        }, {
                            id: "remove",
                            title: "",
                            type: "action",
                            content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
                        }],
                        onRowAction: function(id, permission) {
                            removePermissions([permission]).done(refresh);
                        }
                    }
                });
                var $options = $c.find(".kloudspeaker-configlistview-options");
                kloudspeaker.dom.template("kloudspeaker-tmpl-permission-admin-options").appendTo($options);
                kloudspeaker.ui.process($options, ["localize"]);

                $("#permissions-subject-any").attr('checked', true);

                $optionName = kloudspeaker.ui.controls.select("permissions-name", {
                    values: allTypeKeys,
                    formatter: function(t) {
                        return kloudspeaker.ui.texts.get('permission_' + t);
                    },
                    none: kloudspeaker.ui.texts.get('pluginPermissionsAdminAny')
                });

                $optionUser = kloudspeaker.ui.controls.select("permissions-user", {
                    values: users.all,
                    title: "name",
                    none: kloudspeaker.ui.texts.get('pluginPermissionsAdminAny')
                });

                var $subjectItemSelector = $("#permissions-subject-filesystem-item-selector");
                var $subjectItemSelectorValue = $("#permissions-subject-filesystem-item-value");
                var selectedSubjectItem = false;
                var onSelectItem = function(i) {
                    selectedSubjectItem = i;
                    $subjectItemSelectorValue.val(that._pathFormatter.format(i));
                };
                $("#permissions-subject-filesystem-item-select").click(function(e) {
                    if ($optionSubject.get() == 'filesystem_item') {
                        kloudspeaker.ui.dialogs.itemSelector({
                            title: kloudspeaker.ui.texts.get('pluginPermissionsSelectItemTitle'),
                            message: kloudspeaker.ui.texts.get('pluginPermissionsSelectItemMsg'),
                            actionTitle: kloudspeaker.ui.texts.get('ok'),
                            handler: {
                                onSelect: onSelectItem,
                                canSelect: function(f) {
                                    return true;
                                }
                            }
                        });
                    } else {
                        kloudspeaker.ui.dialogs.folderSelector({
                            title: kloudspeaker.ui.texts.get('pluginPermissionsSelectFolderTitle'),
                            message: kloudspeaker.ui.texts.get('pluginPermissionsSelectFolderMsg'),
                            actionTitle: kloudspeaker.ui.texts.get('ok'),
                            handler: {
                                onSelect: onSelectItem,
                                canSelect: function(f) {
                                    return true;
                                }
                            }
                        });
                    }
                    return false;
                });
                $optionSubject = kloudspeaker.ui.controls.select("permissions-subject", {
                    values: ['none', 'filesystem_item', 'filesystem_child'],
                    formatter: function(s) {
                        return kloudspeaker.ui.texts.get('pluginPermissionsAdminOptionSubject_' + s);
                    },
                    none: kloudspeaker.ui.texts.get('pluginPermissionsAdminAny'),
                    onChange: function(s) {
                        if (s == 'filesystem_item' || s == 'filesystem_child') {
                            selectedSubjectItem = false;
                            $subjectItemSelectorValue.val("");
                            $subjectItemSelector.show();
                        } else {
                            $subjectItemSelector.hide();
                        }
                    }
                });
                refresh();
            });
        };

        this.editGenericPermissions = function(user, changeCallback) {
            var permissionData = {
                "new": [],
                "modified": [],
                "removed": []
            };
            var $content = false;

            kloudspeaker.ui.dialogs.custom({
                resizable: true,
                initSize: [600, 400],
                title: user ? kloudspeaker.ui.texts.get('pluginPermissionsEditDialogTitle', user.name) : kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultDialogTitle'),
                content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-generic-editor", {
                    user: user
                }),
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
                    if (permissionData["new"].length === 0 && permissionData.modified.length === 0 && permissionData.removed.length === 0)
                        return;

                    $content.addClass("loading");
                    kloudspeaker.service.put("permissions/list", permissionData).done(function() {
                        d.close();
                        if (changeCallback) changeCallback();
                    }).fail(d.close);
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#kloudspeaker-pluginpermissions-editor-generic-content");
                    h.center();
                    var $list = false;

                    kloudspeaker.service.get("permissions/user/" + (user ? user.id : '0') + "/generic/").done(function(r) {
                        var done = function(dp) {
                            $content.removeClass("loading");

                            var allTypeKeys = that._permissionTypes.keys.all;
                            var values = kloudspeaker.helpers.mapByKey(r.permissions, "name", "value");
                            var defaultPermissions = dp ? kloudspeaker.helpers.mapByKey(dp.permissions, "name", "value") : {};

                            var permissions = [];

                            $.each(allTypeKeys, function(i, t) {
                                var p = {
                                    name: t,
                                    value: values[t],
                                    subject: '',
                                    user_id: user ? user.id : '0'
                                };
                                if (!values[t]) p.isnew = true;
                                permissions.push(p);
                            });

                            var cols = [{
                                id: "name",
                                title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionName'),
                                formatter: function(item, name) {
                                    if (that._permissionTypes.keys.filesystem.indexOf(name) >= 0) {
                                        if (!user) return that._formatPermissionName(item) + " (" + kloudspeaker.ui.texts.get('permission_system_default') + ")";
                                        return that._formatPermissionName(item) + " (" + kloudspeaker.ui.texts.get(user.is_group == '1' ? 'permission_group_default' : 'permission_user_default') + ")";
                                    }
                                    return that._formatPermissionName(item);
                                }
                            }, {
                                id: "value",
                                title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                                type: "select",
                                options: function(item) {
                                    var itemValues = that._permissionTypes.values[item.name];
                                    if (itemValues) return itemValues;
                                    return ["0", "1"];
                                },
                                none: kloudspeaker.ui.texts.get('permission_value_undefined'),
                                formatter: function(item, k) {
                                    return that._formatPermissionValue(item.name, k);
                                },
                                onChange: function(item, p) {
                                    item.value = p;

                                    permissionData['new'].remove(item);
                                    permissionData.modified.remove(item);
                                    permissionData.removed.remove(item);

                                    if (p != null) {
                                        if (item.isnew) permissionData['new'].push(item);
                                        else permissionData.modified.push(item);
                                    } else {
                                        if (!item.isnew) permissionData.removed.push(item);
                                    }
                                }
                            }];
                            if (user) {
                                cols.push({
                                    id: "default",
                                    title: kloudspeaker.ui.texts.get('permission_system_default'),
                                    formatter: function(p) {
                                        if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
                                        return that._formatPermissionValue(p.name, defaultPermissions[p.name]);
                                    }
                                });
                            }

                            $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-editor-generic-permission-list", {
                                key: "name",
                                columns: cols
                            });
                            $list.add(permissions);
                        };
                        if (user) kloudspeaker.service.get("permissions/user/0/generic/").done(done);
                        else done();
                    }).fail(h.close);
                }
            });
        };

        this.getUserConfigPermissionsListView = function($c, title, u) {
            var permissions = false;
            var defaultPermissions = false;
            var permissionsView = false;

            var refresh = function() {
                $c.addClass("loading");
                kloudspeaker.service.get("permissions/user/" + u.id + "/generic/").done(function(l) {
                    kloudspeaker.service.get("permissions/user/0/generic/").done(function(d) {
                        $c.removeClass("loading");

                        defaultPermissions = kloudspeaker.helpers.mapByKey(d.permissions, "name", "value");

                        var values = kloudspeaker.helpers.mapByKey(l.permissions, "name");
                        permissions = [];

                        $.each(that._permissionTypes.keys.all, function(i, t) {
                            var op = values[t];
                            var p = op ? op : {
                                name: t,
                                value: undefined,
                                subject: '',
                                user_id: u.id
                            };
                            permissions.push(p);
                        });

                        permissionsView.table.set(permissions);
                    });
                });
            };

            permissionsView = new kloudspeaker.view.ConfigListView($c, {
                title: title,
                actions: [{
                    id: "action-edit",
                    content: '<i class="icon-user"></i>',
                    tooltip: kloudspeaker.ui.texts.get(u.is_group == '1' ? 'pluginPermissionsEditGroupPermissionsAction' : 'pluginPermissionsEditUserPermissionsAction'),
                    callback: function() {
                        that.editGenericPermissions(u, refresh);
                    }
                }, {
                    id: "action-edit-defaults",
                    content: '<i class="icon-globe"></i>',
                    tooltip: kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermissionsAction'),
                    callback: function() {
                        that.editGenericPermissions(false, refresh);
                    }
                }],
                table: {
                    id: "config-admin-userpermissions",
                    key: "id",
                    narrow: true,
                    columns: [{
                        id: "name",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionName'),
                        formatter: function(p, v) {
                            if (v in that._permissionTypes.keys.filesystem)
                                return kloudspeaker.ui.texts.get('permission_default_' + v);
                            return kloudspeaker.ui.texts.get('permission_' + v);
                        }
                    }, {
                        id: "value",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                        formatter: function(p, v) {
                            if (v === undefined) return "";
                            return that._formatPermissionValue(p.name, v);
                        }
                    }, {
                        id: "default",
                        title: kloudspeaker.ui.texts.get('permission_system_default'),
                        formatter: function(p) {
                            if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
                            return that._formatPermissionValue(p.name, defaultPermissions[p.name]);
                        }
                    }]
                }
            });

            refresh();

            return {
                refresh: refresh,
                view: permissionsView
            };
        };

        return {
            id: "plugin-permissions",
            initialize: that.initialize,
            itemContextHandler: function(item, ctx, data) {
                if (!kloudspeaker.session.user.admin) return false;

                return {
                    details: {
                        "title-key": "pluginPermissionsContextTitle",
                        "on-render": function(el, $content) {
                            that.renderItemContextDetails(el, item, $content);
                        }
                    },
                    actions: [{
                        id: 'pluginPermissions',
                        'title-key': 'pluginPermissionsAction',
                        callback: function() {
                            that.editItemPermissions(item);
                        }
                    }]
                };
            },
            configViewHandler: {
                views: function() {
                    return [{
                        viewId: "permissions",
                        admin: true,
                        title: kloudspeaker.ui.texts.get("pluginPermissionsConfigViewNavTitle"),
                        onActivate: that.onActivateConfigView
                    }];
                }
            },
            editGenericPermissions: that.editGenericPermissions,
            getUserConfigPermissionsListView: that.getUserConfigPermissionsListView
        };
    }

    /**
     *  Dropbox plugin
     **/
    kloudspeaker.plugin.DropboxPlugin = function() {
        var that = this;
        that.w = 0;
        that.$dbE = false;
        that.items = [];
        that.itemsByKey = {};

        this.initialize = function() {
            that._pathFormatter = new kloudspeaker.ui.formatters.FilesystemItemPath();
            that.itemContext = new kloudspeaker.ui.itemContext();
            kloudspeaker.events.addEventHandler(function(e) {
                if (e.type == 'filesystem/delete') that.onRemoveItems(kloudspeaker.helpers.extractValue(e.payload.items, "id"));
                //TODO else if (e.type == 'filesystem/rename') that.updateItems(kloudspeaker.helpers.extractValue(e.payload.items));
            });
        };

        this.onFileViewActivate = function($container) {
            kloudspeaker.dom.template("kloudspeaker-tmpl-mainview-dropbox").appendTo($container);
            $("#kloudspeaker-dropbox-handle").click(function() {
                that.openDropbox();
            });

            that.$dbE = $("#kloudspeaker-dropbox");
            that.w = $("#kloudspeaker-dropbox-content").outerWidth();

            var onResize = function() {
                var y = $("#kloudspeaker-mainview-header").height();
                that.$dbE.css("top", y + "px").height($(window).height() - y);
            };
            $(window).resize(onResize);
            onResize();

            if (kloudspeaker.ui.draganddrop) {
                var dnd = {
                    canDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return false;
                        var item = obj.payload;
                        return (that.items.indexOf(item) < 0);
                    },
                    dropType: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return false;
                        return "copy";
                    },
                    onDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return;
                        var item = obj.payload;
                        that.onAddItem(item);
                    }
                };
                kloudspeaker.ui.draganddrop.enableDrop($("#kloudspeaker-dropbox-list"), dnd);
                kloudspeaker.ui.draganddrop.enableDrop($("#kloudspeaker-dropbox-handle"), dnd);
            }

            var ab = kloudspeaker.ui.controls.dropdown({
                element: $("#kloudspeaker-dropbox-actions"),
                container: $("body"),
                hideDelay: 0,
                dynamic: true,
                onShow: function(drp, items) {
                    that.getActions(function(a) {
                        if (!a) {
                            drp.hide();
                            return;
                        }
                        drp.items(a);
                    });
                },
                onItem: function(i, cbr) {
                    if (cbr) cbr.done(that.emptyDropbox);
                    else that.emptyDropbox();
                },
                onBlur: function(dd) {

                }
            });
            that._updateButton();
            that.openDropbox(false);
        };

        this.onFileViewDeactivate = function() {
            $("#kloudspeaker-dropbox").remove();
        };

        this.getActions = function(cb) {
            if (that.items.length === 0) {
                cb([]);
                return;
            }
            var actions = kloudspeaker.helpers.getPluginActions(kloudspeaker.plugins.getItemCollectionPlugins(that.items, {
                src: "dropbox"
            }));
            actions.push({
                title: "-"
            });
            actions.push({
                "title-key": "dropboxEmpty"
            });
            cb(kloudspeaker.helpers.cleanupActions(actions));
        };

        this.openDropbox = function(o) {
            var open = that.$dbE.hasClass("opened");
            if (window.def(o)) {
                if (o == open) return;
            } else {
                o = !open;
            }

            if (!o) that.$dbE.removeClass("opened").addClass("closed").animate({
                "width": "0"
            }, 300);
            else that.$dbE.addClass("opened").removeClass("closed").animate({
                "width": that.w + ""
            }, 300);
        };

        this.emptyDropbox = function() {
            that.items = [];
            that.itemsByKey = {};
            that.refreshList();
        };

        this.onAddItem = function(i) {
            that.openDropbox(true);
            var list = i;
            if (!window.isArray(i))
                list = [i];
            $.each(list, function(ind, item) {
                if (that.items.indexOf(item) >= 0) return;
                that.items.push(item);
                that.itemsByKey[item.id] = item;
            });
            that.refreshList();
            that._updateButton();
        };

        this.onRemoveItem = function(item) {
            that.items.remove(item);
            delete that.itemsByKey[item.id];
            that.refreshList();
            that._updateButton();
        };

        this.onRemoveItems = function(ids) {
            var count = 0;
            $.each(ids, function(i, id) {
                var item = that.itemsByKey[id];
                if (!item) return;

                that.items.remove(item);
                delete that.itemsByKey[id];
                count++;
            });
            if (count > 0) {
                that.refreshList();
                that._updateButton();
            }
        };

        this.refreshList = function() {
            $("#kloudspeaker-dropbox-list").empty().append(kloudspeaker.dom.template("kloudspeaker-tmpl-mainview-dropbox-item", that.items));
            var $items = $("#kloudspeaker-dropbox-list .kloudspeaker-dropbox-list-item");
            $items.click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                var $i = $(this);
                var item = $i.tmplItem().data;
                $i.tooltip('hide');
                that.itemContext.open({
                    item: item,
                    element: $i,
                    container: kloudspeaker.App.getElement(),
                    viewport: kloudspeaker.App.getElement()
                });
                return false;
            }).each(function() {
                var $i = $(this);
                var item = $i.tmplItem().data;
                $i.tooltip({
                    placement: "bottom",
                    html: true,
                    title: that._pathFormatter.format(item),
                    trigger: "hover"
                });
            });
            if (kloudspeaker.ui.draganddrop) {
                kloudspeaker.ui.draganddrop.enableDrag($items, {
                    onDragStart: function($e, e) {
                        var item = $e.tmplItem().data;
                        return {
                            type: 'filesystemitem',
                            payload: item
                        };
                    }
                });
            }
            $("#kloudspeaker-dropbox-list .kloudspeaker-dropbox-list-item > a.item-remove").click(function() {
                kloudspeaker.ui.hideActivePopup();
                var $t = $(this);
                that.onRemoveItem($t.tmplItem().data);
            });
        };

        this._updateButton = function() {
            var $btn = $("#kloudspeaker-dropbox-actions > button");
            if (that.items.length > 0)
                $btn.removeClass("disabled");
            else
                $btn.addClass("disabled");
        };

        return {
            id: "plugin-dropbox",
            initialize: that.initialize,
            fileViewHandler: {
                onActivate: that.onFileViewActivate,
                onDeactivate: that.onFileViewDeactivate
            },
            itemContextHandler: function(item, ctx, data) {
                return {
                    actions: [{
                        id: 'pluginDropbox',
                        'title-key': 'pluginDropboxAddTo',
                        callback: function() {
                            that.onAddItem(item);
                            that.openDropbox(true);
                        }
                    }]
                };
            },
            itemCollectionHandler: function(items, ctx) {
                if (ctx && ctx.src == 'dropbox') return false;
                return {
                    actions: [{
                        'title-key': 'pluginDropboxAddTo',
                        callback: function() {
                            return that.onAddItem(items);
                        }
                    }]
                };
            }
        };
    }

    /**
     *  Share plugin
     **/
    kloudspeaker.plugin.SharePlugin = function() {
        var that = this;

        this.initialize = function() {
            that._timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));

            kloudspeaker.App.registerView("share", {
                getView: function(rqParts, urlParams) {
                    if (rqParts.length != 2) return false;
                    var df = $.Deferred();

                    var shareId = rqParts[1];
                    kloudspeaker.service.get("public/" + shareId + "/info/").done(function(result) {
                        if (!result || !result.type || (["download", "upload", "prepared_download"].indexOf(result.type) < 0)) {
                            df.resolve(new kloudspeaker.ui.FullErrorView(kloudspeaker.ui.texts.get('shareViewInvalidRequest')));
                            return;
                        }

                        if (result.restriction == "private") {
                            if (!kloudspeaker.session || !kloudspeaker.session.user) {
                                df.resolve(false);
                                return;
                            }
                        } else if (result.restriction == "pw" && !result.auth) {
                            df.resolve(new that.ShareAccessPasswordView(shareId, result));
                            return;
                        }

                        df.resolve(that._getShareView(shareId, result));
                    }).fail(function() {
                        df.resolve(new kloudspeaker.ui.FullErrorView(kloudspeaker.ui.texts.get('shareViewInvalidRequest')));
                    });
                    return df.promise();
                }
            });
        };

        this._getShareView = function(id, info) {
            var serviceUrl = kloudspeaker.service.url("public/" + id, true);
            var urlProvider = {
                get: function(path, param) {
                    var url = serviceUrl;
                    if (path) url = url + path;
                    if (param) url = kloudspeaker.helpers.urlWithParam(url, param);
                    return kloudspeaker.helpers.noncachedUrl(url);
                }
            }

            if (info.type == "download") {
                return new that.ShareDownloadView(id, urlProvider, info.name);
            } else if (info.type == "prepared_download") {
                return new that.SharePreparedDownloadView(id, urlProvider, info.name);
            } else {
                return new that.ShareUploadView(id, urlProvider, info.name);
            }
            return new kloudspeaker.ui.FullErrorView(kloudspeaker.ui.texts.get('shareViewInvalidRequest'));
        };

        this.ShareAccessPasswordView = function(shareId, info) {
            var vt = this;

            this.init = function($c) {
                var df = $.Deferred();
                vt._$c = $c;

                kloudspeaker.dom.loadContentInto($c, kloudspeaker.plugins.url("Share", "public_share_access_password.html"), function() {
                    $("#kloudspeaker-share-access-button").click(vt._onAccess);
                    $("#kloudspeaker-share-access-password").focus();
                    $("#kloudspeaker-share-access-password").bind('keypress', function(e) {
                        if ((e.keyCode || e.which) == 13) vt._onAccess();
                    });
                    df.resolve();
                }, ['localize']);
                return df.promise();
            };

            this._onAccess = function() {
                var pw = $("#kloudspeaker-share-access-password").val();
                if (!pw || pw.length === 0) return;
                var key = window.Base64.encode(pw);

                kloudspeaker.service.post("public/" + shareId + "/key/", {
                    key: key
                }).done(function(r) {
                    if (!r.result) {
                        kloudspeaker.ui.dialogs.notification({
                            message: kloudspeaker.ui.texts.get('shareAccessPasswordFailed')
                        });
                        $("#kloudspeaker-share-access-password").focus();
                        return;
                    }
                    //proceed to original view
                    that._getShareView(shareId, info, key).init(vt._$c);
                });
            };
        };

        this.ShareDownloadView = function(shareId, u, shareName) {
            var vt = this;

            this.init = function($c) {
                var df = $.Deferred();
                kloudspeaker.dom.loadContentInto($c, kloudspeaker.plugins.url("Share", "public_share_download.html"), function() {
                    $("#kloudspeaker-share-title").text(kloudspeaker.ui.texts.get("shareViewDownloadTitle", shareName));

                    setTimeout(function() {
                        kloudspeaker.ui.download(u.get());
                    }, 1000);
                    df.resolve();
                }, ['localize']);
                return df.promise();
            };
        };

        this.SharePreparedDownloadView = function(shareId, u, shareName) {
            var vt = this;

            this.init = function($c) {
                var df = $.Deferred();
                kloudspeaker.dom.loadContentInto($c, kloudspeaker.plugins.url("Share", "public_share_prepared_download.html"), function() {
                    $("#kloudspeaker-share-download-prepare").text(kloudspeaker.ui.texts.get("shareViewPreparedDownloadPreparingTitle", shareName));
                    $("#kloudspeaker-share-download").text(kloudspeaker.ui.texts.get("shareViewPreparedDownloadDownloadingTitle", shareName));
                    $("#kloudspeaker-share-download-error").text(kloudspeaker.ui.texts.get("shareViewPreparedDownloadErrorTitle", shareName));

                    kloudspeaker.service.get(u.get("/prepare")).done(function(r) {
                        $("#kloudspeaker-share-download-prepare").hide();
                        $("#kloudspeaker-share-download").show();
                        kloudspeaker.ui.download(u.get(false, "key=" + r.key));
                    }).fail(function() {
                        this.handled = true;
                        $("#kloudspeaker-share-download-prepare").hide();
                        $("#kloudspeaker-share-download-error").show();
                    });
                    df.resolve();
                }, ['localize']);
                return df.promise();
            };
        };

        this.ShareUploadView = function(shareId, u, shareName) {
            var vt = this;

            this.init = function($c) {
                var df = $.Deferred();
                var uploadSpeedFormatter = new kloudspeaker.ui.formatters.Number(1, kloudspeaker.ui.texts.get('dataRateKbps'), kloudspeaker.ui.texts.get('decimalSeparator'));

                kloudspeaker.dom.loadContentInto($c, kloudspeaker.plugins.url("Share", "public_share_upload.html"), function() {
                    $("#kloudspeaker-share-title").text(kloudspeaker.ui.texts.get("shareViewUploadTitle", shareName));
                    vt._uploadProgress = new that.PublicUploaderProgress($("#kloudspeaker-share-public-upload-progress"));

                    kloudspeaker.ui.uploader.initUploadWidget($("#kloudspeaker-share-public-uploader"), {
                        url: u.get(false, "format=binary"),
                        dropElement: $("#kloudspeaker-share-public"),
                        handler: {
                            start: function(files, ready) {
                                vt._uploadProgress.start(kloudspeaker.ui.texts.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length));
                                ready();
                            },
                            progress: function(pr, br) {
                                var speed = "";
                                if (br) speed = uploadSpeedFormatter.format(br / 1024);
                                vt._uploadProgress.update(pr, speed);
                            },
                            finished: function() {
                                setTimeout(function() {
                                    vt._uploadProgress.success(kloudspeaker.ui.texts.get('mainviewFileUploadComplete'));
                                }, 1000);
                            },
                            failed: function(e) {
                                if (e && e.code == 216) {
                                    vt._uploadProgress.failure(kloudspeaker.ui.texts.get('mainviewFileUploadNotAllowed'));
                                } else {
                                    vt._uploadProgress.failure(kloudspeaker.ui.texts.get('mainviewFileUploadFailed'));
                                }
                            }
                        }
                    });
                    df.resolve();
                }, ['localize']);
                return df.promise();
            };
        };

        this.PublicUploaderProgress = function($e) {
            var t = this;
            t._$title = $e.find(".title");
            t._$speed = $e.find(".speed");
            t._$bar = $e.find(".bar");

            return {
                start: function(title) {
                    $e.removeClass("success failure");
                    t._$title.text(title ? title : "");
                    t._$speed.text("");
                    t._$bar.css("width", "0%");
                },
                update: function(progress, speed) {
                    t._$bar.css("width", progress + "%");
                    t._$speed.text(speed ? speed : "");
                },
                success: function(text) {
                    $e.addClass("success");
                    t._$bar.css("width", "0%");
                    t._$title.text(text);
                    t._$speed.text("");
                },
                failure: function(text) {
                    $e.addClass("failure");
                    t._$title.text(text);
                    t._$speed.text("");
                    t._$bar.css("width", "0%");
                }
            }
        };

        this.renderItemContextDetails = function(el, item, $content, data) {
            $content.addClass("loading");
            kloudspeaker.templates.load("shares-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("Share", "content.html"))).done(function() {
                $content.removeClass("loading");
                kloudspeaker.dom.template("kloudspeaker-tmpl-shares", {
                    item: item
                }).appendTo($content);
                that.loadShares(item).done(function(shares) {
                    that.initContent(item, shares, $content);
                });
            });
        };

        this.loadShares = function(item) {
            if (!item) return kloudspeaker.service.get("share/all/");
            return kloudspeaker.service.get("share/items/" + item.id).done(function(result) {
                that.refreshShares(result);
            });
        };

        this.refreshShares = function(shares) {
            that.shares = shares;
            that.shareIds = [];

            for (var i = 0, j = that.shares.length; i < j; i++)
                that.shareIds.push(shares[i].id);
        };

        this.getShare = function(id) {
            return that.shares[that.shareIds.indexOf(id)];
        }

        this.initContent = function(item, shares, $c) {
            var title = item.shareTitle ? item.shareTitle : kloudspeaker.ui.texts.get(item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle');
            $("#share-item-title").html(title);
            $("#share-item-name").html(item.name);
            $("#share-dialog-content").removeClass("loading");
            $("#share-new").click(function() {
                that.onAddShare(item);
            });
            that._context = kloudspeaker.ui.controls.slidePanel($("#share-list"), {
                relative: true
            });

            that.updateShareList(item);
        };

        this.getShareLink = function(share) {
            return kloudspeaker.App.getPageUrl("share/" + share.id);
        };

        this.updateShareList = function(item) {
            $("#share-items").empty();

            if (that.shares.length === 0) {
                $("#share-items").html('<div class="no-share-items">' + kloudspeaker.ui.texts.get("shareDialogNoShares") + '</div>');
                return;
            }

            var opt = {
                itemClass: function() {
                    var c = "item-share";
                    if (!this.data.active)
                        c = c + " inactive";
                    if (!this.data.name || this.data.name.length === 0)
                        c = c + " unnamed";
                    return c;
                },
                link: function() {
                    return that.getShareLink(this.data);
                }
            };

            kloudspeaker.dom.template("share-template", that.shares, opt).appendTo("#share-items");
            kloudspeaker.ui.process($("#share-list"), ["localize"]);
            if (!kloudspeaker.ui.clipboard) {
                $(".share-link-copy").hide();
            } else {
                var h = {
                    onMouseOver: function($e, clip) {
                        clip.setHandCursor(true);
                        $e.addClass("hover");
                    },
                    onMouseOut: function($e) {
                        $e.removeClass("hover");
                    }
                }
                $.each($(".share-link-copy"), function(i, e) {
                    var share = $(e).tmplItem().data;
                    kloudspeaker.ui.clipboard.enableCopy($(e), that.getShareLink(share), h);
                });
            }

            $(".share-link-toggle").click(function() {
                var share = $(this).tmplItem().data;
                if (!share.active) return;

                var $link = $(this).parent();
                var $c = $link.parent().siblings(".share-link-content");
                var $share = $c.parent();

                $(".share-link-content").not($c).hide();
                $(".item-share").not($share).removeClass("active");

                $share.toggleClass("active");
                $c.slideToggle();
                return false;
            });
            $(".item-share").hover(function() {
                    $(".item-share").removeClass("hover");
                    $(this).addClass("hover");
                },
                function() {});
            $(".share-edit").click(function(e) {
                var share = $(this).tmplItem().data;
                that.onEditShare(item, share);
            });
            $(".share-remove").click(function(e) {
                var share = $(this).tmplItem().data;
                that.removeShare(item, share);
            });
        }

        this.openContextContent = function(toolbarId, contentTemplateId, tmplData) {
            /*var $c = $("#share-context").empty();*/
            var $c = that._context.getContentElement().empty();
            kloudspeaker.dom.template(contentTemplateId, tmplData).appendTo($c);

            that._context.show(false, 280);
            /*$("#share-context-container").animate({
                "top" : "18px"
            }, 500);*/
            return $c;
        }

        this.closeAddEdit = function() {
            that._context.hide();
            /*$("#share-context-container").animate({
                "top" : "300px"
            }, 500);*/
        }

        this.onAddShare = function(item) {
            var $c = that.openContextContent('add-share-title', 'share-context-addedit-template');
            that._initShareEditor(false, $c, {
                onEdit: function(v) {
                    $("#share-items").empty().append('<div class="loading"/>')
                    that.closeAddEdit();
                    that.addShare(item, v.name || '', v.expiration, v.active, v.restriction);
                },
                onCancel: function() {
                    that.closeAddEdit();
                }
            });
        };

        this.onEditShare = function(item, share) {
            var $c = that.openContextContent('edit-share-title', 'share-context-addedit-template', {
                edit: true
            });
            that._initShareEditor(share, $c, {
                onEdit: function(v) {
                    $("#share-items").empty().append('<div class="loading"/>')
                    that.closeAddEdit();
                    that.editShare(share.id, v.name || '', v.expiration, v.active, v.restriction).done(function(result) {
                        var s = that.getShare(share.id);
                        s.name = v.name;
                        s.active = v.active;
                        s.expiration = kloudspeaker.helpers.formatInternalTime(v.expiration);
                        s.restriction = v.restriction ? v.restriction.type : false;
                        that.updateShareList(item);
                    }).fail(that.d.close);
                },
                onCancel: function() {
                    that.closeAddEdit();
                }
            });
        }

        this._initShareEditor = function(share, $c, o) {
            kloudspeaker.ui.process($c, ["localize"]);
            kloudspeaker.ui.controls.datepicker("share-validity-expirationdate-value", {
                format: kloudspeaker.ui.texts.get('shortDateTimeFormat'),
                time: true
            });

            $("#share-general-name").val(share ? share.name : '');
            $("#share-general-active").attr("checked", share ? share.active : true);

            var oldRestrictionPw = (share ? share.restriction == 'pw' : false);
            if (share) {
                if (share.restriction == 'pw')
                    $("#share-access-public-password").attr('checked', true);
                else if (share.restriction == 'private')
                    $("#share-access-private-loggedin").attr('checked', true);
                else
                    $("#share-access-norestriction").attr('checked', true);
            } else
                $("#share-access-norestriction").attr('checked', true);

            if (share && share.expiration)
                $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").set(kloudspeaker.helpers.parseInternalTime(share.expiration));

            if (oldRestrictionPw) $("#share-access-public-password-value").attr("placeholder", kloudspeaker.ui.texts.get("shareDialogShareAccessChangePwTitle"));
            else $("#share-access-public-password-value").attr("placeholder", kloudspeaker.ui.texts.get("shareDialogShareAccessEnterPwTitle"));

            var getValues = function() {
                var name = $("#share-general-name").val();
                var active = $("#share-general-active").is(":checked");
                var expiration = $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").get();

                var restriction = false;
                if ($("#share-access-private-loggedin").is(":checked")) restriction = {
                    type: "private"
                };
                else if ($("#share-access-public-password").is(":checked")) {
                    var value = $("#share-access-public-password-value").val();
                    if (!oldRestrictionPw && (!value || value.length === 0)) {
                        $("#share-access-public-password-value").addClass("error");
                        return false;
                    }
                    restriction = {
                        type: "pw",
                        value: value
                    };
                }

                return {
                    name: name,
                    expiration: expiration,
                    active: active,
                    restriction: restriction
                };
            }
            $("#share-addedit-btn-ok").click(function() {
                var v = getValues();
                if (!v) return;
                o.onEdit(v);
            });

            $("#share-addedit-btn-cancel").click(function() {
                o.onCancel();
            });

            return {
                getValues: getValues
            }
        };

        this.onOpenShares = function(item) {
            kloudspeaker.templates.load("shares-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("Share", "content.html"))).done(function() {
                kloudspeaker.ui.dialogs.custom({
                    resizable: true,
                    initSize: [600, 470],
                    title: item.shareTitle ? item.shareTitle : kloudspeaker.ui.texts.get(item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle'),
                    content: kloudspeaker.dom.template("kloudspeaker-tmpl-shares", {
                        item: item,
                        bubble: false
                    }),
                    buttons: [{
                        id: "no",
                        "title": kloudspeaker.ui.texts.get('dialogClose')
                    }],
                    "on-button": function(btn, d) {
                        d.close();
                        that.d = false;
                    },
                    "on-show": function(h, $d) {
                        that.d = h;
                        that.loadShares(item).done(function(shares) {
                            that.initContent(item, shares, $d);
                        });
                    }
                });
            });
        };

        this.addShare = function(item, name, expiration, active, restriction) {
            return kloudspeaker.service.post("share/", {
                item: item.id,
                name: name,
                expiration: kloudspeaker.helpers.formatInternalTime(expiration),
                active: active,
                restriction: restriction
            }).done(function(result) {
                that.refreshShares(result);
                that.updateShareList(item);
            }).fail(that.d.close);
        }

        this.editShare = function(id, name, expiration, active, restriction) {
            return kloudspeaker.service.put("share/" + id, {
                id: id,
                name: name,
                expiration: kloudspeaker.helpers.formatInternalTime(expiration),
                active: active,
                restriction: restriction
            });
        }

        this.removeShare = function(item, share) {
            return kloudspeaker.service.del("share/" + share.id).done(function(result) {
                var i = that.shareIds.indexOf(share.id);
                that.shareIds.splice(i, 1);
                that.shares.splice(i, 1);
                that.updateShareList(item);
            }).fail(that.d.close);
        }

        this.removeAllItemShares = function(item) {
            return kloudspeaker.service.del("share/items/" + item.id);
        }

        this.getActionValidationMessages = function(action, items, validationData) {
            var messages = [];
            $.each(items, function(i, itm) {
                var msg;
                if (itm.reason == 'item_shared') msg = kloudspeaker.ui.texts.get("pluginShareActionValidationDeleteShared", itm.item.name);
                else if (itm.reason == 'item_shared_others') msg = kloudspeaker.ui.texts.get("pluginShareActionValidationDeleteSharedOthers", itm.item.name);
                else return;

                messages.push({
                    message: msg,
                    acceptable: itm.acceptable,
                    acceptKey: itm.acceptKey
                });
            });
            return messages;
        }

        this.getListCellContent = function(item, data) {
            if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return "";
            var itemData = data["plugin-share-info"][item.id];
            if (!itemData) return "<div id='item-share-info-" + item.id + "' class='filelist-item-share-info empty'></div>";
            if (itemData.own > 0)
                return "<div id='item-share-info-" + item.id + "' class='filelist-item-share-info'><i class='icon-external-link'></i>&nbsp;" + itemData.own + "</div>";
            return "<div id='item-share-info-" + item.id + "' class='filelist-item-share-info others' title='" + kloudspeaker.ui.texts.get("pluginShareFilelistColOtherShared") + "'><i class='icon-external-link'></i></div>";
        };

        this._updateListCellContent = function(item, data) {};

        this.showShareBubble = function(item, cell) {
            that.d = kloudspeaker.ui.controls.dynamicBubble({
                element: cell,
                title: item.name,
                container: $("#kloudspeaker-filelist-main")
            });

            kloudspeaker.templates.load("shares-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("Share", "content.html"))).done(function() {
                that.d.content(kloudspeaker.dom.template("kloudspeaker-tmpl-shares", {
                    item: item,
                    bubble: true
                }));
                that.loadShares(item).done(function(shares) {
                    that.initContent(item, shares, that.d.element());
                    that.d.position();
                });
            });
        };

        this.onActivateConfigView = function($c, cv) {
            var shares = false;
            var items = false;
            var invalid = [];
            var listView = false;

            var updateShares = function() {
                cv.showLoading(true);

                that.loadShares().done(function(l) {
                    shares = l.shares[kloudspeaker.session.user.id];
                    invalid = l.invalid;

                    items = [];
                    $.each(kloudspeaker.helpers.getKeys(l.items), function(i, k) {
                        items.push(l.items[k]);
                    });
                    $.each(l.nonfs, function(i, itm) {
                        items.push({
                            id: itm.id,
                            name: itm.name,
                            customType: itm.type
                        });
                    });

                    listView.table.set(items);

                    cv.showLoading(false);
                });
            };
            var isValid = function(i) {
                if (invalid.length === 0) return true;
                return (invalid.indexOf(i.id) < 0);
            };

            listView = new kloudspeaker.view.ConfigListView($c, {
                table: {
                    key: "id",
                    columns: [{
                        id: "icon",
                        title: "",
                        valueMapper: function(item) {
                            if (item.customType) return ""; //TODO type icon
                            return isValid(item) ? '<i class="icon-file"></i>' : '<i class="icon-exclamation"></i>';
                        }
                    }, {
                        id: "name",
                        title: kloudspeaker.ui.texts.get('fileListColumnTitleName')
                    }, {
                        id: "path",
                        title: kloudspeaker.ui.texts.get('pluginShareConfigViewPathTitle'),
                        formatter: function(item) {
                            if (item.customType || !item.path) return "";
                            var p = (kloudspeaker.filesystem.rootsById[item.root_id] ? kloudspeaker.filesystem.rootsById[item.root_id].name : item.root_id) + ":";
                            var path = item.path.substring(0, item.path.length - (item.name.length + (item.is_file ? 0 : 1)));
                            return p + "/" + path;
                        }
                    }, {
                        id: "count",
                        title: kloudspeaker.ui.texts.get('pluginShareConfigViewCountTitle'),
                        formatter: function(item) {
                            return shares[item.id].length;
                        }
                    }, {
                        id: "edit",
                        title: "",
                        type: "action",
                        formatter: function(item) {
                            return isValid(item) ? '<i class="icon-edit"></i>' : '';
                        }
                    }, {
                        id: "remove",
                        title: "",
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRow: function($r, item) {
                        if (!isValid(item)) $r.addClass("error");
                    },
                    onRowAction: function(id, item) {
                        if (id == "edit") {
                            var shareTitle = false;
                            if (item.customType) {
                                // TODO register type handlers from plugins
                                if (item.customType == 'ic') shareTitle = kloudspeaker.ui.texts.get("pluginItemCollectionShareTitle");
                            }
                            that.onOpenShares({
                                id: item.id,
                                name: item.name,
                                shareTitle: shareTitle,
                                is_file: item.is_file
                            });
                        } else if (id == "remove") {
                            that.removeAllItemShares(item).done(updateShares);
                        }
                    }
                }
            });
            updateShares();
        };

        this.processUserData = function(l) {
            var userData = {
                users: [],
                groups: [],
                all: [],
                usersById: {}
            };
            for (var i = 0, j = l.length; i < j; i++) {
                var u = l[i];
                if (u.is_group == "0") {
                    userData.users.push(u);
                    userData.all.push(u);
                    userData.usersById[u.id] = u;
                } else {
                    userData.groups.push(u);
                    userData.all.push(u);
                    userData.usersById[u.id] = u;
                }
            }
            return userData;
        };

        this.onActivateConfigAdminView = function($c, cv) {
            var pathFormatter = new kloudspeaker.ui.formatters.FilesystemItemPath();

            kloudspeaker.templates.load("shares-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("Share", "content.html"))).done(function() {
                kloudspeaker.service.get("configuration/users").done(function(l) {
                    var users = that.processUserData(l);

                    var shares = false;
                    var items = false;
                    var invalid = [];
                    var nonfs = [];
                    var listView = false;

                    var getQueryParams = function(i) {
                        var user = $optionUser.get();
                        var item = $optionItem.get();

                        var params = {};
                        if (user) params.user_id = user.id;
                        if (item) {
                            params.item = item;

                            if (item == 'filesystem_item' || item == 'filesystem_child') {
                                if (selectedItem)
                                    params.item_id = selectedItem.id;
                                else
                                    params.item_id = null;
                            }
                        }

                        return params;
                    };

                    var refresh = function() {
                        cv.showLoading(true);
                        listView.table.refresh().done(function() {
                            cv.showLoading(false);
                        });
                    };

                    var currentTime = kloudspeaker.helpers.formatInternalTime(new Date());

                    listView = new kloudspeaker.view.ConfigListView($c, {
                        actions: [{
                            id: "action-remove",
                            content: '<i class="icon-trash"></i>',
                            cls: "btn-danger",
                            depends: "table-selection",
                            callback: function(sel) {
                                kloudspeaker.ui.dialogs.confirmation({
                                    title: kloudspeaker.ui.texts.get("pluginShareConfigRemoveShareTitle"),
                                    message: kloudspeaker.ui.texts.get("pluginShareConfigRemoveShareMessage", [sel.length]),
                                    callback: function() {
                                        kloudspeaker.service.del("share/list/", {
                                            list: kloudspeaker.helpers.extractValue(sel, "id")
                                        }).done(refresh);
                                    }
                                });
                            }
                        }, {
                            id: "action-activate",
                            content: '<i class="icon-check"></i>',
                            depends: "table-selection",
                            tooltip: kloudspeaker.ui.texts.get('pluginShareConfigViewShareActivate'),
                            callback: function(sel) {
                                kloudspeaker.service.put("share/list/", {
                                    ids: kloudspeaker.helpers.extractValue(sel, "id"),
                                    active: true
                                }).done(refresh);
                            }
                        }, {
                            id: "action-deactivate",
                            content: '<i class="icon-check-empty"></i>',
                            depends: "table-selection",
                            tooltip: kloudspeaker.ui.texts.get('pluginShareConfigViewShareDeactivate'),
                            callback: function(sel) {
                                kloudspeaker.service.put("share/list/", {
                                    ids: kloudspeaker.helpers.extractValue(sel, "id"),
                                    active: false
                                }).done(refresh);
                            }
                        }, {
                            id: "action-refresh",
                            content: '<i class="icon-refresh"></i>',
                            callback: refresh
                        }],
                        table: {
                            key: "id",
                            narrow: true,
                            remote: {
                                path: "share/query",
                                paging: {
                                    max: 50
                                },
                                queryParams: getQueryParams,
                                onData: function(l) {
                                    shares = l.data;
                                    invalid = l.invalid;
                                    nonfs = l.nonfs;
                                    items = l.items;

                                    $.each(l.nonfs, function(i, itm) {
                                        items[itm.id] = {
                                            id: itm.id,
                                            name: itm.name,
                                            customType: itm.type
                                        };
                                    });
                                },
                                onLoad: function(pr) {
                                    $c.addClass("loading");
                                    pr.done(function(r) {
                                        $c.removeClass("loading");
                                    });
                                }
                            },
                            onRow: function($r, s) {
                                if (s.invalid) $r.addClass("error");
                                if (s.expiration && s.expiration <= currentTime) $r.addClass("warning");
                                if (s.active != "1") $r.addClass("inactive");
                            },
                            columns: [{
                                type: "selectrow"
                            }, {
                                id: "icon",
                                title: "",
                                valueMapper: function(s) {
                                    if (items[s.item_id].customType) return ""; //TODO type icon
                                    return s.invalid ? '<i class="icon-exclamation"></i>' : '<i class="icon-file"></i>';
                                }
                            }, {
                                id: "restriction",
                                title: "",
                                formatter: function(s) {
                                    if (s.restriction == 'private') return '<i class="icon-user" title="' + kloudspeaker.ui.texts.get('shareDialogShareAccessLoggedInTitle') + '" />';
                                    else if (s.restriction == 'pw') return '<i class="icon-lock" title="' + kloudspeaker.ui.texts.get('shareDialogShareAccessPasswordTitle').replace(':', '') + '" />';
                                    else return '<i class="icon-globe" title="' + kloudspeaker.ui.texts.get('shareDialogShareAccessNoRestrictionTitle') + '" />';
                                }
                            }, {
                                id: "user_id",
                                title: kloudspeaker.ui.texts.get('pluginShareConfigViewUserTitle'),
                                formatter: function(s) {
                                    return users.usersById[s.user_id].name;
                                }
                            }, {
                                id: "name",
                                title: kloudspeaker.ui.texts.get('pluginShareConfigViewShareNameTitle')
                            }, {
                                id: "item_name",
                                title: kloudspeaker.ui.texts.get('pluginShareConfigViewItemNameTitle'),
                                valueMapper: function(s) {
                                    if (s.invalid) return ""; //TODO
                                    return items[s.item_id].name;
                                }
                            }, {
                                id: "path",
                                title: kloudspeaker.ui.texts.get('pluginShareConfigViewPathTitle'),
                                formatter: function(s) {
                                    if (s.invalid) return ""; //TODO

                                    var item = items[s.item_id];
                                    if (item.customType || !item.path) return "";

                                    var p = (kloudspeaker.filesystem.rootsById[item.root_id] ? kloudspeaker.filesystem.rootsById[item.root_id].name : item.root_id) + ":";
                                    var path = item.path.substring(0, item.path.length - (item.name.length + (item.is_file ? 0 : 1)));
                                    return p + "/" + path;
                                }
                            }, {
                                id: "expiration",
                                title: kloudspeaker.ui.texts.get('pluginShareConfigViewExpirationTitle'),
                                formatter: function(s) {
                                    if (!s.expiration) return "";
                                    return that._timestampFormatter.format(s.expiration);
                                }
                            }, {
                                id: "active",
                                title: kloudspeaker.ui.texts.get('pluginShareConfigViewActiveTitle'),
                                formatter: function(s) {
                                    if (s.active == "1") return '<i class="icon-check"/>';
                                    else return '<i class="icon-check-empty"/>';
                                }
                            }, {
                                id: "edit",
                                title: "",
                                type: "action",
                                formatter: function(s) {
                                    return s.invalid ? '' : '<i class="icon-edit"></i>';
                                }
                            }, {
                                id: "remove",
                                title: "",
                                type: "action",
                                content: '<i class="icon-trash"></i>'
                            }],
                            onRowAction: function(id, s) {
                                if (id == "edit") {
                                    var _editor = false;

                                    kloudspeaker.ui.dialogs.custom({
                                        resizable: true,
                                        initSize: [600, 400],
                                        title: s.id, //TODO
                                        content: kloudspeaker.dom.template("share-context-addedit-template", {
                                            editDialog: true
                                        }),
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
                                            var values = _editor.getValues();
                                            that.editShare(s.id, values.name || '', values.expiration, values.active, values.restriction).done(function() {
                                                d.close();
                                                refresh();
                                            }).fail(d.close);
                                        },
                                        "on-show": function(h, $d) {
                                            _editor = that._initShareEditor(s, $d);
                                        }
                                    });
                                } else if (id == "remove") {
                                    kloudspeaker.service.del("share/" + s.id).done(refresh);
                                }
                            }
                        }
                    });
                    var $options = $c.find(".kloudspeaker-configlistview-options");
                    kloudspeaker.dom.template("kloudspeaker-tmpl-share-admin-options").appendTo($options);
                    kloudspeaker.ui.process($options, ["localize"]);

                    var $optionUser = kloudspeaker.ui.controls.select("share-user", {
                        values: users.users,
                        title: "name",
                        none: kloudspeaker.ui.texts.get('pluginShareAdminAny')
                    });

                    var $itemSelector = $("#share-filesystem-item-selector");
                    var $itemSelectorValue = $("#share-filesystem-item-value");
                    var selectedItem = false;
                    var onSelectItem = function(i) {
                        selectedItem = i;
                        $itemSelectorValue.val(pathFormatter.format(i));
                    };
                    $("#share-filesystem-item-select").click(function(e) {
                        if ($optionItem.get() == 'filesystem_item') {
                            kloudspeaker.ui.dialogs.itemSelector({
                                title: kloudspeaker.ui.texts.get('pluginShareSelectItemTitle'),
                                message: kloudspeaker.ui.texts.get('pluginShareSelectItemMsg'),
                                actionTitle: kloudspeaker.ui.texts.get('ok'),
                                handler: {
                                    onSelect: onSelectItem,
                                    canSelect: function(f) {
                                        return true;
                                    }
                                }
                            });
                        } else {
                            kloudspeaker.ui.dialogs.folderSelector({
                                title: kloudspeaker.ui.texts.get('pluginShareSelectFolderTitle'),
                                message: kloudspeaker.ui.texts.get('pluginShareSelectFolderMsg'),
                                actionTitle: kloudspeaker.ui.texts.get('ok'),
                                handler: {
                                    onSelect: onSelectItem,
                                    canSelect: function(f) {
                                        return true;
                                    }
                                }
                            });
                        }
                        return false;
                    });
                    var $optionItem = kloudspeaker.ui.controls.select("share-item", {
                        values: ['none', 'filesystem_item', 'filesystem_child'],
                        formatter: function(s) {
                            return kloudspeaker.ui.texts.get('pluginShareAdminOptionItem_' + s);
                        },
                        none: kloudspeaker.ui.texts.get('pluginShareAdminAny'),
                        onChange: function(s) {
                            if (s == 'filesystem_item' || s == 'filesystem_child') {
                                selectedItem = false;
                                $itemSelectorValue.val("");
                                $itemSelector.show();
                            } else {
                                $itemSelector.hide();
                            }
                        }
                    });

                    refresh();
                });
            });
        };

        return {
            id: "plugin-share",
            backendPluginId: "Share",
            resources: {
                css: true
            },
            initialize: that.initialize,

            configViewHandler: {
                views: function() {
                    var views = [{
                        viewId: "shares",
                        title: kloudspeaker.ui.texts.get("pluginShareConfigViewNavTitle"),
                        onActivate: that.onActivateConfigView
                    }];

                    if (kloudspeaker.session.user.admin) views.push({
                        viewId: "allshares",
                        admin: true,
                        title: kloudspeaker.ui.texts.get("pluginShareConfigViewNavTitle"),
                        onActivate: that.onActivateConfigAdminView
                    });

                    return views;
                }
            },
            fileViewHandler: {
                filelistColumns: function() {
                    return [{
                        "id": "share-info",
                        "request-id": "plugin-share-info",
                        "title-key": "",
                        "content": that.getListCellContent,
                        "request": function(parent) {
                            return {};
                        },
                        "on-click": function(item, data) {
                            if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return;
                            var itemData = data["plugin-share-info"][item.id];
                            if (!itemData) return;

                            if (itemData.own > 0)
                                that.showShareBubble(item, $("#item-share-info-" + item.id));
                        }
                    }];
                }
            },
            itemContextHandler: function(item, ctx, data) {
                if (!kloudspeaker.filesystem.hasPermission(item, "share_item")) return false;

                return {
                    actions: [{
                        id: 'pluginShare',
                        'title-key': 'itemContextShareMenuTitle',
                        icon: 'external-link',
                        callback: function() {
                            that.onOpenShares(item);
                        }
                    }]
                };
            },

            actionValidationHandler: function() {
                return {
                    getValidationMessages: that.getActionValidationMessages
                }
            },

            openShares: that.onOpenShares
        };
    }

    /**
     *  Registration -plugin published as AMD module
     **/
    kloudspeaker.plugin.RegistrationPlugin = function() {
        deprecated: true
    }
}(window.jQuery, window.kloudspeaker);
