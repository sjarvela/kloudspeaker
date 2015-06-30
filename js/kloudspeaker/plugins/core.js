define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/plugins'], function(app, settings, plugins) {
    //TODO remove reference to global "kloudspeaker"

    var that = {};

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

    plugins.register({
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
    });
});
