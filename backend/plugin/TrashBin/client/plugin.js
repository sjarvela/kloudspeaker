/**
 * plugin.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict"; // jshint ;_;

    /**
     *  Trash bin -plugin
     **/
    var TrashBinPlugin = function() {
        var that = this;

        this.initialize = function() {
            that._timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));

            var onSession = function() {
                that._softDelete = (kloudspeaker.session && kloudspeaker.session.data.plugins["TrashBin"] && kloudspeaker.session.data.plugins["TrashBin"]["soft_delete"]);
            };
            kloudspeaker.events.addEventHandler(onSession, "session/start");
            if (kloudspeaker.session) onSession();
        };

        this._onDrop = function(items) {
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

        this._onFileViewInit = function(fv) {
            that._fileView = fv;
            that.$el = $('<div id="kloudspeaker-trashbin" style="display: none"><i class="icon-trash drop-target dropdown-toggle"></i></div>').appendTo($("body"));

            kloudspeaker.ui.draganddrop.enableDrop(that.$el.find(".drop-target"), {
                canDrop: function($e, e, obj) {
                    if (!obj || obj.type != 'filesystemitem') return false;
                    return true;
                },
                dropType: function($e, e, obj) {
                    if (!obj || obj.type != 'filesystemitem') return false;
                    return "move";
                },
                onDrop: function($e, e, obj) {
                    if (!obj || obj.type != 'filesystemitem') return;
                    var items = obj.payload;
                    that._onDrop(items);
                }
            });

            if (!that._softDelete) return;

            that.$el.addClass("folder");

            kloudspeaker.ui.controls.dropdown({
                element: that.$el,
                items: [{
                    title: kloudspeaker.ui.texts.get('pluginTrashBinOpenAction'),
                    callback: function() {
                        that._fileView.changeToFolder('trash/');
                    }
                }, {
                    title: '-'
                }, {
                    title: kloudspeaker.ui.texts.get('pluginTrashBinEmptyAction'),
                    callback: that._onEmptyTrash
                }],
            });

            that._fileView.addCustomFolderType("trash", {
                onSelectFolder: function(id) {
                    var df = $.Deferred();
                    kloudspeaker.service.post("trash/data", {
                        rq_data: that._fileView.getDataRequest()
                    }).done(function(r) {
                        //that._collectionsNav.setActive(r.ic);

                        var fo = {
                            type: "trash",
                            id: "",
                            name: kloudspeaker.ui.texts.get('pluginTrashBinViewTitle')
                        };
                        var d = {};
                        $.each(r.data, function(i, item) {
                            item.created = that._timestampFormatter.format(item.created);
                            item.location = kloudspeaker.filesystem.rootsByFolderId[item.folder_id].name;

                            var p = item.path.endsWith('/') ? item.path.substring(0, item.path.length - 1) : item.path;
                            var folderPathIndex = p.lastIndexOf('/');
                            if (folderPathIndex > 0)
                                item.folderPath = item.path.substring(0, folderPathIndex + 1);
                            else
                                item.folderPath = false;

                            d[item.id] = item;
                        });
                        var data = {
                            items: r.items,
                            data: d
                        };
                        df.resolve(fo, data);
                    });

                    return df.promise();
                },

                onFolderDeselect: function(f) {
                    //that._collectionsNav.setActive(false);
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
                        items: that._getToolActions(data),
                        hideDelay: 0,
                        style: 'submenu'
                    });
                    that._fileView.addCommonFileviewActions($fa);
                },

                dragType: function() {
                    return false; //disable dragging
                },

                getItemActions: function(item) {
                    var result = [];
                    if (that._canRestore(item)) result.push({
                        id: 'restore',
                        title: kloudspeaker.ui.texts.get("pluginTrashBinRestoreAction"),
                        callback: function() {
                            that._onRestore(item);
                        }
                    });
                    if (that._canDelete(item)) result.push({
                        id: 'delete',
                        title: kloudspeaker.ui.texts.get("pluginTrashBinDeleteAction"),
                        callback: function() {
                            that._onDelete(item);
                        }
                    });
                    return $.Deferred().resolve(result);
                },

                getSelectionActions: function(selected) {
                    var result = [];
                    if (selected && selected.length > 0) {
                        var restore = true;
                        var del = true;
                        $.each(selected, function(i, item) {
                            if (!that._canRestore(item)) restore = false;
                            if (!that._canDelete(item)) del = false;
                        });

                        if (restore) result.push({
                            id: 'restore',
                            title: kloudspeaker.ui.texts.get("pluginTrashBinRestoreAction"),
                            callback: function() {
                                that._onRestore(selected);
                            }
                        });
                        if (del) result.push({
                            id: 'delete',
                            title: kloudspeaker.ui.texts.get("pluginTrashBinDeleteAction"),
                            callback: function() {
                                that._onDelete(selected);
                            }
                        });
                    }
                    return $.Deferred().resolve(result);
                },

                handleAction: function(ac, item, t, ctx) {
                    if (ac == 'onClick') {
                        if (t == 'restore') {
                            that._onRestore(item);
                            return true;
                        }
                        if (t == 'delete') {
                            that._onDelete(item);
                            return true;
                        }
                    }
                    that._fileView.showActionMenu(item, ctx.element);
                    return true;
                },

                getFileListCols: function() {
                    return {
                        "name": {
                            width: 250
                        },
                        "size": {},
                        "original-path": {
                            "title-key": 'pluginTrashBinOriginalPathCol',
                            width: 150,
                            content: function(item, data) {
                                var id = data[item.id];
                                return id.location + (id.folderPath ? ":/" + id.folderPath : '');
                            }
                        },
                        "trashed": {
                            "title-key": 'pluginTrashBinTrashedCol',
                            width: 150,
                            content: function(item, data) {
                                return data[item.id].created;
                            }
                        },
                        "restore": {
                            id: "restore",
                            content: function(item, data) {
                                if (!that._canRestore(item)) return "";
                                return "<a href='javascript: void(0)' title='" + kloudspeaker.ui.texts.get("pluginTrashBinRestoreAction") + "'><i class='icon-reply'></i></a>";
                            }
                        },
                        "delete": {
                            id: "delete",
                            content: function(item, data) {
                                if (!that._canDelete(item)) return "";
                                return "<a href='javascript: void(0)' title='" + kloudspeaker.ui.texts.get("pluginTrashBinDeleteAction") + "'><i class='icon-trash'></i></a>";
                            }
                        }
                    };
                }
            });
        };

        this._canRestore = function(item) {
            //can restore only root items
            return (item.parent_id == item.root_id);
        };

        this._canDelete = function(item) {
            //can delete only root items
            return (item.parent_id == item.root_id);
        };

        this._getToolActions = function(d) {
            return [{
                title: kloudspeaker.ui.texts.get('pluginTrashBinEmptyAction'),
                callback: that._onEmptyTrash
            }];
        };

        this._onFileViewActivate = function($mv, h) {
            that.$el.show();
        };

        this._onFileViewDeactivate = function($mv, h) {
            that.$el.hide();
        };

        this._onRestore = function(i) {
            var items = window.isArray(i) ? i : [i];
            var allowed = true;
            $.each(items, function(ind, item) {
                if (!that._canRestore(item)) allowed = false;
            });
            if (items.length === 0 || !allowed) return;

            kloudspeaker.service.post('trash/restore', {
                items: kloudspeaker.helpers.extractValue(items, 'id')
            }).done(function() {
                that._fileView.refresh();
            });
        };

        this._onDelete = function(i) {
            var items = window.isArray(i) ? i : [i];
            var allowed = true;
            $.each(items, function(ind, item) {
                if (!that._canDelete(item)) allowed = false;
            });
            if (items.length === 0 || !allowed) return;

            var msg = items.length > 1 ? kloudspeaker.ui.texts.get("pluginTrashBinDeleteMultiMessage", [items.length]) : kloudspeaker.ui.texts.get("pluginTrashBinDeleteSingleMessage", items[0].name);
            kloudspeaker.ui.dialogs.confirmation({
                title: kloudspeaker.ui.texts.get("pluginTrashBinDeleteAction"),
                message: msg,
                callback: function() {
                    kloudspeaker.service.post('trash/delete', {
                        items: kloudspeaker.helpers.extractValue(items, 'id')
                    }).done(function() {
                        that._fileView.refresh();
                    });
                }
            });
        };

        this._onEmptyTrash = function() {
            kloudspeaker.ui.dialogs.confirmation({
                title: kloudspeaker.ui.texts.get("pluginTrashBinEmptyTitle"),
                message: kloudspeaker.ui.texts.get("pluginTrashBinEmptyConfirmation"),
                callback: function() {
                    kloudspeaker.service.post('trash/empty').done(function() {
                        that._fileView.refresh();
                    });
                }
            });
        };

        return {
            id: "plugin-trashbin",
            backendPluginId: "TrashBin",
            initialize: that.initialize,
            resources: {
                texts: true,
                css: true
            },
            fileViewHandler: {
                onInit: that._onFileViewInit,
                onActivate: that._onFileViewActivate,
                onDeactivate: that._onFileViewDeactivate
            }
        };
    }

    kloudspeaker.plugins.register(new TrashBinPlugin());
}(window.jQuery, window.kloudspeaker);
