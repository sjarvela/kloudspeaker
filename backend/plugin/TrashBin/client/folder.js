define(['kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/controls', 'kloudspeaker/dom'], function(service, fs, uif, texts, controls, dom) {
    return function(fileView, controller) {
        var that = this;
        that._timestampFormatter = new uif.Timestamp(texts.get('shortDateTimeFormat'));

        var getToolActions = function(d) {
            return [{
                title: texts.get('pluginTrashBinEmptyAction'),
                callback: that._onEmptyTrash
            }];
        };

        return {
            onSelectFolder: function(id) {
                var df = $.Deferred();
                service.post("trash/data", {
                    rq_data: fileView.getDataRequest()
                }).done(function(r) {
                    var fo = {
                        type: "trash",
                        id: "",
                        name: texts.get('pluginTrashBinViewTitle')
                    };
                    var d = {};
                    $.each(r.data, function(i, item) {
                        item.created = that._timestampFormatter.format(item.created);
                        item.location = fs.rootsByFolderId[item.folder_id].name;

                        var p = item.path.endsWith('/') ? item.path.substring(0, item.path.length - 1) : item.path;
                        var folderPathIndex = p.lastIndexOf('/');
                        if (folderPathIndex > 0)
                            item.folderPath = item.path.substring(0, folderPathIndex + 1);
                        else
                            item.folderPath = false;

                        d[item["item_id"]] = item;
                    });
                    $.each(r.items, function(i, item) {
                        item.data = d[item.id];
                        item.trash_id = item.data.id;
                    });
                    var data = {
                        items: r.items,
                        data: d
                    };
                    df.resolve(fo, data);
                });

                return df.promise();
            },

            onFolderDeselect: function(f) {},

            onRenderFolderView: function(f, data, $h, $tb) {
                dom.template("kloudspeaker-tmpl-fileview-header-custom", {
                    folder: f
                }).appendTo($h);

                var opt = {
                    title: function() {
                        return this.data.title ? this.data.title : texts.get(this.data['title-key']);
                    }
                };
                var $fa = $("#kloudspeaker-fileview-folder-actions");
                var actionsElement = dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                    icon: 'icon-cog',
                    dropdown: true
                }, opt).appendTo($fa);

                controls.dropdown({
                    element: actionsElement,
                    items: getToolActions(data),
                    hideDelay: 0,
                    style: 'submenu'
                });
                fileView.addCommonFileviewActions($fa);
            },

            dragType: function() {
                return false; //disable dragging
            },

            getItemActions: function(item) {
                var result = [];
                if (controller.canRestore(item)) result.push({
                    id: 'restore',
                    title: texts.get("pluginTrashBinRestoreAction"),
                    callback: function() {
                        controller.onRestore(item);
                    }
                });
                if (controller.canDelete(item)) result.push({
                    id: 'delete',
                    title: texts.get("pluginTrashBinDeleteAction"),
                    callback: function() {
                        controller.onDelete(item);
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
                        if (!controller.canRestore(item)) restore = false;
                        if (!controller.canDelete(item)) del = false;
                    });

                    if (restore) result.push({
                        id: 'restore',
                        title: texts.get("pluginTrashBinRestoreAction"),
                        callback: function() {
                            controller.onRestore(selected);
                        }
                    });
                    if (del) result.push({
                        id: 'delete',
                        title: texts.get("pluginTrashBinDeleteAction"),
                        callback: function() {
                            controller.onDelete(selected);
                        }
                    });
                }
                return $.Deferred().resolve(result);
            },

            handleAction: function(ac, item, t, ctx) {
                if (ac == 'onClick') {
                    if (t == 'restore') {
                        controller.onRestore(item);
                        return true;
                    }
                    if (t == 'delete') {
                        controller.onDelete(item);
                        return true;
                    }
                }
                fileView.showActionMenu(item, ctx.element);
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
                            if (!controller.canRestore(item)) return "";
                            return "<a href='javascript: void(0)' title='" + texts.get("pluginTrashBinRestoreAction") + "'><i class='icon-reply'></i></a>";
                        }
                    },
                    "delete": {
                        id: "delete",
                        content: function(item, data) {
                            if (!controller.canDelete(item)) return "";
                            return "<a href='javascript: void(0)' title='" + texts.get("pluginTrashBinDeleteAction") + "'><i class='icon-trash'></i></a>";
                        }
                    }
                };
            }

        };
    };
});
