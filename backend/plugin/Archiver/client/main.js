define(['kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/permissions', 'kloudspeaker/localization', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui', 'kloudspeaker/utils'], function(settings, session, plugins, service, events, permissions, loc, dialogs, ui, utils) {
    var that = {};

    that.initialize = function() {};

    that.onCompress = function(i, f) {
        if (!i) return;

        var defaultName = '';
        var item = false;
        var items = utils.arrayize(i);
        if (items.length == 1) {
            item = i[0];
        }

        var df = $.Deferred();
        var doCompress = function(folder) {
            if (item) defaultName = item.name + ".zip";

            dialogs.input({
                title: loc.get('pluginArchiverCompressDialogTitle'),
                message: loc.get('pluginArchiverCompressDialogMessage'),
                defaultValue: defaultName,
                yesTitle: loc.get('pluginArchiverCompressDialogAction'),
                noTitle: loc.get('dialogCancel'),
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
            dialogs.folderSelector({
                title: loc.get('pluginArchiverCompressDialogTitle'),
                message: loc.get('pluginArchiverCompressSelectFolderDialogMessage'),
                actionTitle: loc.get('ok'),
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

    that.onDownloadCompressed = function(items) {
        //TODO show progress
        return service.post("archiver/download", {
            items: items
        }).done(function(r) {
            //TODO remove progress
            ui.download(service.url('archiver/download/' + r.id, true));
        });
    };

    that._onCompress = function(items, folder, name) {
        return service.post("archiver/compress", {
            'items': items,
            'folder': folder,
            'name': name
        }).done(function(r) {
            events.dispatch('archiver/compress', {
                items: items,
                folder: folder,
                name: name
            });
            events.dispatch('filesystem/update', {
                folder: folder
            });
        });
    };

    that._onExtract = function(a, folder) {
        return service.post("archiver/extract", {
            item: a,
            folder: folder
        }).done(function(r) {
            events.dispatch('archiver/extract', {
                item: a,
                folder: folder
            });
            events.dispatch('filesystem/update', {
                folder: folder
            });
        });
    };

    that._isArchive = function(item) {
        if (!item.is_file) return false;

        var ext = item.extension.toLowerCase();
        return ext == 'zip'; //TODO get supported extensions from backend
    };

    plugins.register({
        id: "plugin-archiver",
        initialize: that.initialize,
        getDownloadCompressedUrl: function(i) {
            var single = false;

            if (!utils.isArray(i)) single = i;
            else if (i.length == 1) single = i[0];

            if (single)
                return service.url("archiver/download?item=" + single.id, true);

            return false; //TODO enable downloading array of items?
        },
        itemContextHandler: function(item, ctx, data) {
            var root = (item.id == item.root_id);

            var writable = !root && permissions.hasFilesystemPermission(item, "filesystem_item_access", "rw");
            var parentWritable = !root && permissions.hasFilesystemPermission(item.parent_id, "filesystem_item_access", "rw");
            //TODO folder? is this ever something else than parent?
            var folderWritable = !root && ctx.folder && ctx.folder_writable;
            var s = session.get();

            if (parentWritable && that._isArchive(item)) {
                if (!s.plugins.Archiver.actions.extract) return false;

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

            if (s.plugins.Archiver.actions.download) actions.push({
                "title-key": "pluginArchiverDownloadCompressed",
                icon: 'archive',
                type: "primary",
                group: "download",
                callback: function() {
                    that.onDownloadCompressed([item]);
                }
            });
            if (ctx.folder && folderWritable && s.plugins.Archiver.actions.compress) actions.push({
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
            var s = session.get();
            if (s.plugins.Archiver.actions.compress) actions.push({
                "title-key": "pluginArchiverCompress",
                icon: 'archive',
                callback: function() {
                    return that.onCompress(items)
                }
            });
            if (s.plugins.Archiver.actions.download) actions.push({
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
    });
});
