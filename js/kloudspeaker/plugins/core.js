define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/permissions', 'kloudspeaker/filesystem', 'kloudspeaker/ui/dialogs', 'kloudspeaker/localization', 'kloudspeaker/ui'], function(settings, plugins, permissions, filesystem, dialogs, loc, ui) {
    var that = {};

    var doDelete = function(items) {
        var many = (window.isArray(items) && items.length > 1);
        var single = many ? null : (window.isArray(items) ? items[0] : items);

        var title = many ? loc.get("deleteManyConfirmationDialogTitle") : (single.is_file ? loc.get("deleteFileConfirmationDialogTitle") : loc.get("deleteFolderConfirmationDialogTitle"));
        var msg = many ? loc.get("confirmDeleteManyMessage", items.length) : loc.get(single.is_file ? "confirmFileDeleteMessage" : "confirmFolderDeleteMessage", [single.name]);

        var df = $.Deferred();
        dialogs.confirmation({
            title: title,
            message: msg,
            callback: function() {
                $.when(filesystem.del(items)).then(df.resolve, df.reject);
            }
        });
        return df.promise();
    };

    plugins.register({
        id: "plugin-core",
        itemContextHandler: function(item, ctx, data) {
            var root = (item.id == item.root_id);
            var writable = permissions.hasFilesystemPermission(item, "filesystem_item_access", "rw", true);
            var movable = writable && !root;
            var deletable = !root && permissions.hasFilesystemPermission(item, "filesystem_item_access", "rwd", true);
            var parentWritable = !root && permissions.hasFilesystemPermission(item.parent_id, "filesystem_item_access", "rw", true);

            var actions = [];
            if (item.is_file) {
                actions.push({
                    'title-key': 'actionDownloadItem',
                    icon: 'download',
                    type: "primary",
                    group: "download",
                    callback: function() {
                        ui.download(filesystem.getDownloadUrl(item));
                    }
                });
                actions.push({
                    title: '-'
                });
            } else {
                if (writable && settings["file-view"]["create-empty-file-action"])
                    actions.push({
                        'title-key': 'actionCreateEmptyFileItem',
                        icon: 'file',
                        callback: function() {
                            dialogs.input({
                                message: loc.get('actionCreateEmptyFileMessage'),
                                title: loc.get('actionCreateEmptyFileTitle'),
                                defaultValue: "",
                                yesTitle: loc.get('ok'),
                                noTitle: loc.get('dialogCancel'),
                                handler: {
                                    isAcceptable: function(v) {
                                        if (!v || v.trim().length === 0) return false;
                                        if (/[\/\\]|(\.\.)/.test(v)) return false;
                                        return true;

                                    },
                                    onInput: function(v) {
                                        filesystem.createEmptyFile(item, v);
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
                    return filesystem.copy(item);
                }
            });
            if (parentWritable)
                actions.push({
                    'title-key': 'actionCopyItemHere',
                    icon: 'copy',
                    callback: function() {
                        return filesystem.copyHere(item);
                    }
                });

            if (movable) {
                actions.push({
                    'title-key': 'actionMoveItem',
                    icon: 'mail-forward',
                    callback: function() {
                        return filesystem.move(item);
                    }
                });
                actions.push({
                    'title-key': 'actionRenameItem',
                    icon: 'pencil',
                    callback: function() {
                        return filesystem.rename(item);
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
                    return filesystem.copy(items);
                }
            }];

            if (!roots) {
                actions.push({
                    'title-key': 'actionMoveMultiple',
                    icon: 'mail-forward',
                    callback: function() {
                        return filesystem.move(items);
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
    });
});
