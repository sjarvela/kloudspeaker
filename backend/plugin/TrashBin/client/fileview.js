define(['kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dnd', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/utils', 'kloudspeaker/trashbin/folder'], function(service, fs, texts, controls, dnd, dialogs, dom, utils, TrashbinFolder) {
    return function(plugin) {
        var that = this;

        // file view init
        this.onInit = function(fv) {
            that._fileView = fv;
            that.$el = $('<div id="kloudspeaker-trashbin" style="display: none"><i class="fa fa-trash drop-target dropdown-toggle"></i></div>').appendTo($("body"));

            dnd.enableDrop(that.$el.find(".drop-target"), {
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

            if (!plugin.isSoftDelete()) return;

            that.$el.addClass("folder");

            controls.dropdown({
                element: that.$el,
                items: [{
                    title: texts.get('pluginTrashBinOpenAction'),
                    callback: function() {
                        that._fileView.changeToFolder('trash/');
                    }
                }, {
                    title: '-'
                }, {
                    title: texts.get('pluginTrashBinEmptyAction'),
                    callback: that._onEmptyTrash
                }],
            });

            that._fileView.addCustomFolderType("trash", new TrashbinFolder(fv, this));
        };

        // file view activate
        this.onActivate = function($mv, h) {
            that.$el.show();
        };

        // file view deactivate
        this.onDeactivate = function($mv, h) {
            that.$el.hide();
        };

        this._onDrop = function(items) {
            var many = (utils.isArray(items) && items.length > 1);
            var single = many ? null : (utils.isArray(items) ? items[0] : items);

            var title = many ? texts.get("deleteManyConfirmationDialogTitle") : (single.is_file ? texts.get("deleteFileConfirmationDialogTitle") : texts.get("deleteFolderConfirmationDialogTitle"));
            var msg = many ? texts.get("confirmDeleteManyMessage", items.length) : texts.get(single.is_file ? "confirmFileDeleteMessage" : "confirmFolderDeleteMessage", [single.name]);

            var df = $.Deferred();
            dialogs.confirmation({
                title: title,
                message: msg,
                callback: function() {
                    $.when(fs.del(items)).then(df.resolve, df.reject);
                }
            });
            return df.promise();
        };

        this.canRestore = function(item) {
            //can restore only root items
            return (item.parent_id == item.root_id);
        };

        this.canDelete = function(item) {
            //can delete only root items
            return (item.parent_id == item.root_id);
        };

        this.onRestore = function(i) {
            var items = utils.isArray(i) ? i : [i];
            var allowed = true;
            $.each(items, function(ind, item) {
                if (!that.canRestore(item)) allowed = false;
            });
            if (items.length === 0 || !allowed) return;

            service.post('trash/restore', {
                items: utils.extractValue(items, 'trash_id')
            }).done(function() {
                that._fileView.refresh();
            }).fail(function(e) {
                if (e.code == 201) {
                    this.handled = true;

                    if (e.details.parent_missing) {
                        dialogs.info({
                            message: texts.get('pluginTrashBinRestoreFailedParentMissing')
                        });
                    } else if (e.details.item_exists) {
                        //TODO confirm and overwrite
                        dialogs.info({
                            message: texts.get('pluginTrashBinRestoreFailedItemExists')
                        });
                    } else {
                        dialogs.info({
                            message: texts.get('pluginTrashBinRestoreFailed')
                        });
                    }
                }
            });
        };

        this.onDelete = function(i) {
            var items = utils.isArray(i) ? i : [i];
            var allowed = true;
            $.each(items, function(ind, item) {
                if (!that.canDelete(item)) allowed = false;
            });
            if (items.length === 0 || !allowed) return;

            var msg = items.length > 1 ? texts.get("pluginTrashBinDeleteMultiMessage", [items.length]) : texts.get("pluginTrashBinDeleteSingleMessage", items[0].name);
            dialogs.confirmation({
                title: texts.get("pluginTrashBinDeleteAction"),
                message: msg,
                callback: function() {
                    service.post('trash/delete', {
                        items: utils.extractValue(items, 'trash_id')
                    }).done(function() {
                        that._fileView.refresh();
                    });
                }
            });
        };

        this._onEmptyTrash = function() {
            dialogs.confirmation({
                title: texts.get("pluginTrashBinEmptyTitle"),
                message: texts.get("pluginTrashBinEmptyConfirmation"),
                callback: function() {
                    service.post('trash/empty').done(function() {
                        that._fileView.refresh();
                    });
                }
            });
        };
    };
});
