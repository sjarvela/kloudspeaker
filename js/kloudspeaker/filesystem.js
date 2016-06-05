define(['kloudspeaker/plugins', 'kloudspeaker/events', 'kloudspeaker/permissions', 'kloudspeaker/service', 'kloudspeaker/utils', 'kloudspeaker/ui/dialogs', 'kloudspeaker/localization', 'kloudspeaker/ui'], function(plugins, events, permissions, service, utils, dialogs, loc, ui) {
    var mfs = {
        
    };

    var session = null;
    var mobile = false;   //TODO move somewhere?

    events.addEventHandler(function(e) {
        if (e.type == 'session/start' || e.type == 'session/end') {
            //mfs.permissionCache = {};
            mfs.roots = [];
            mfs.allRoots = false;
            mfs.rootsById = {};
            mfs.rootsByFolderId = {};
        }
        if (e.type == 'session/start') {
            var s = e.payload;
            var allRoots = (s.user && s.user.admin) ? s.data.roots : false;
            mfs.updateRoots(s.data.folders, allRoots);
        }
    });

    mfs.setup = function() {
        session = require('kloudspeaker/session');
        var app =  require('kloudspeaker/instance');
        mobile = app.mobile;    //TODO remove
    };

    mfs.updateRoots = function(f, allRoots) {
        var s = session.get();
        if (f && s.user) {
            mfs.roots = f.sort(function(a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            for (var i = 0, j = f.length; i < j; i++) {
                mfs.rootsById[f[i].id] = f[i];
                mfs.rootsByFolderId[f[i].folder_id] = f[i];
            }

            if (allRoots) {
                mfs.allRoots = allRoots;
                for (var k = 0, l = allRoots.length; k < l; k++)
                    if (!mfs.rootsById[allRoots[k].id]) {
                        mfs.rootsById[allRoots[k].id] = allRoots[k];
                        mfs.rootsById[allRoots[k].folder_id] = allRoots[k];
                    }
            }
        }
    };

    mfs.download = function(item) {
        var df = $.Deferred();
        mfs._validated(mfs._download, [item], "download", loc.get("actionDeniedDownload", item.name)).done(df.resolve).fail(df.reject);
        return df;
    }

    mfs._download = function(item) {
        return service.post("filesystem/" + item.id + "/validate_download/").done(function(r) {
            ui.download(mfs.getDownloadUrl(item));
        });
    }

    mfs.getDownloadUrl = function(item) {
        if (!item.is_file) return false;
        var url = service.url("filesystem/" + item.id, true);
        if (mobile)
            url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
        return url;
    };

    mfs.getUploadUrl = function(folder) {
        if (!folder || folder.is_file) return null;
        var url = service.url("filesystem/" + folder.id + '/files/');
        return url + ((url.indexOf('?') >= 0) ? "&" : "?") + "format=binary";
    };

    mfs.itemDetails = function(item, data) {
        return service.post((item.detailsId ? (item.detailsId + "/details/") : ("filesystem/" + item.id + "/details/")), {
            data: data
        }).done(function(r) {
            if (item.id && r.permissions)
                permissions.putFilesystemPermissions(item.id, r.permissions);
            //mfs.permissionCache[item.id] = r.permissions;
            if (item.parent_id && r.parent_permissions)
                permissions.putFilesystemPermissions(item.parent_id, r.parent_permissions);
            //mfs.permissionCache[item.parent_id] = r.parent_permissions;
        });
    };

    mfs.folderInfo = function(id, hierarchy, data) {
        return service.post("filesystem/" + (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), {
            data: data
        }).done(function(r) {
            if (id)
                permissions.putFilesystemPermissions(id, r.permissions);
            //mfs.permissionCache[id] = r.permissions;
        });
    };

    mfs.findFolder = function(d, data) {
        return service.post("filesystem/find/", {
            folder: d,
            data: data
        });
    };

    /*mfs.hasPermission = function(item, name, required) {
        var s = session.get();
        if (!s.user) return false;
        if (s.user.admin) return true;
        return utils.hasPermission(mfs.permissionCache[((typeof(item) === "string") ? item : item.id)], name, required);
    };*/

    mfs.items = function(parent, files, allRoots) {
        if (parent == null) {
            var df = $.Deferred();
            var s = session.get();
            df.resolve({
                folders: (allRoots && s.user.admin) ? mfs.allRoots : mfs.roots,
                files: []
            });
            return df.promise();
        }
        return service.get("filesystem/" + parent.id + "/items/?files=" + (files ? '1' : '0'));
    };

    mfs.createEmptyFile = function(parent, name) {
        return service.post("filesystem/" + parent.id + "/empty_file", {
            name: name
        }).done(function() {
            events.dispatch('filesystem/create_item', {
                parent: parent,
                name: name
            });
        });
    };

    mfs.copy = function(i, to) {
        if (!i) return;

        if (utils.isArray(i) && i.length > 1) {
            if (!to) {
                var df = $.Deferred();
                dialogs.folderSelector({
                    title: loc.get('copyMultipleFileDialogTitle'),
                    message: loc.get('copyMultipleFileMessage', [i.length]),
                    actionTitle: loc.get('copyFileDialogAction'),
                    handler: {
                        onSelect: function(f) {
                            mfs._validated(mfs._copyMany, [i, f], "copy", loc.get("actionDeniedCopyMany", i.length), loc.get("actionAcceptCopyMany", i.length)).done(df.resolve).fail(df.reject);
                        },
                        canSelect: function(f) {
                            return mfs.canCopyTo(i, f);
                        }
                    }
                });
                return df.promise();
            } else
                return mfs._copyMany(i, to);

            return;
        }

        if (utils.isArray(i)) i = i[0];

        if (!to) {
            var df2 = $.Deferred();
            dialogs.folderSelector({
                title: loc.get('copyFileDialogTitle'),
                message: loc.get('copyFileMessage', [i.name]),
                actionTitle: loc.get('copyFileDialogAction'),
                handler: {
                    onSelect: function(f) {
                        mfs._validated(mfs._copy, [i, f], "copy", loc.get("actionDeniedCopy", i.name), loc.get("actionAcceptCopy", i.name)).done(df2.resolve).fail(df2.reject);
                    },
                    canSelect: function(f) {
                        return mfs.canCopyTo(i, f);
                    }
                }
            });
            return df2.promise();
        } else
            return mfs._copy(i, to);
    };

    mfs.copyHere = function(item, name) {
        if (!item) return;

        if (!name) {
            var df = $.Deferred();
            dialogs.input({
                title: loc.get('copyHereDialogTitle'),
                message: loc.get('copyHereDialogMessage'),
                defaultValue: item.name,
                yesTitle: loc.get('copyFileDialogAction'),
                noTitle: loc.get('dialogCancel'),
                handler: {
                    isAcceptable: function(n) {
                        return !!n && n.length > 0 && n != item.name;
                    },
                    onInput: function(n) {
                        mfs._validated(mfs._copyHere, [item, n], "copy", loc.get("actionDeniedCopy", item.name), loc.get("actionAcceptCopy", item.name)).done(df.resolve).fail(df.reject);
                    }
                }
            });
            return df.promise();
        } else {
            return mfs._copyHere(item, name);
        }
    };

    mfs.canCopyTo = function(item, to) {
        if (utils.isArray(item)) {
            for (var i = 0, j = item.length; i < j; i++)
                if (!mfs.canCopyTo(item[i], to)) return false;
            return true;
        }

        // cannot copy into file
        if (to.is_file) return false;

        // cannot copy into itself
        if (item.id == to.id) return false;

        // cannot copy into same location
        if (item.parent_id == to.id) return false;
        return true;
    };

    mfs.canMoveTo = function(item, to) {
        if (utils.isArray(item)) {
            for (var i = 0, j = item.length; i < j; i++)
                if (!mfs.canMoveTo(item[i], to)) return false;
            return true;
        }

        // cannot move into file
        if (to.is_file) return false;

        // cannot move folder into its own subfolder
        if (!to.is_file && item.root_id == to.root_id && to.path.startsWith(item.path)) return false;

        // cannot move into itself
        if (item.id == to.id) return false;

        // cannot move into same location
        if (item.parent_id == to.id) return false;
        return true;
    };

    mfs._copyHere = function(i, name, acceptKeys) {
        return service.post("filesystem/" + i.id + "/copy/", {
            name: name,
            acceptKeys: acceptKeys
        }).done(function(r) {
            events.dispatch('filesystem/copy', {
                items: [i],
                name: name
            });
        });
    };

    mfs._copy = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        service.post("filesystem/" + i.id + "/copy/", {
            folder: to.id,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            events.dispatch('filesystem/copy', {
                items: [i],
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                dialogs.confirmation({
                    title: loc.get('copyOverwriteConfirmationTitle'),
                    message: loc.get('copyOverwriteConfirmationMsg', [i.name]),
                    callback: function() {
                        mfs._copy(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs._copyMany = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        service.post("filesystem/items/", {
            action: 'copy',
            items: i,
            to: to,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            events.dispatch('filesystem/copy', {
                items: i,
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                var files = e.data.files;

                dialogs.confirmation({
                    title: loc.get(files.length > 1 ? 'copyManyOverwriteConfirmationTitle' : 'copyOverwriteConfirmationTitle'),
                    message: files.length > 1 ? loc.get('copyManyOverwriteConfirmationMsg', [files.length]) : loc.get('copyOverwriteConfirmationMsg', [files[0].name]),
                    callback: function() {
                        mfs._copyMany(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs.move = function(i, to) {
        if (!i) return;

        if (utils.isArray(i) && i.length > 1) {
            if (!to) {
                var df = $.Deferred();
                dialogs.folderSelector({
                    title: loc.get('moveMultipleFileDialogTitle'),
                    message: loc.get('moveMultipleFileMessage', [i.length]),
                    actionTitle: loc.get('moveFileDialogAction'),
                    handler: {
                        onSelect: function(f) {
                            mfs._validated(mfs._moveMany, [i, f], "move", loc.get("actionDeniedMoveMany", i.length), loc.get("actionAcceptMoveMany", i.length)).done(df.resolve).fail(df.reject);
                        },
                        canSelect: function(f) {
                            return mfs.canMoveTo(i, f);
                        }
                    }
                });
                return df.promise();
            } else
                return mfs._moveMany(i, to);
        }

        if (utils.isArray(i)) i = i[0];

        if (!to) {
            var df2 = $.Deferred();
            dialogs.folderSelector({
                title: loc.get('moveFileDialogTitle'),
                message: loc.get('moveFileMessage', [i.name]),
                actionTitle: loc.get('moveFileDialogAction'),
                handler: {
                    onSelect: function(f) {
                        mfs._validated(mfs._move, [i, f], "move", loc.get("actionDeniedMove", i.name), loc.get("actionAcceptMove", i.name)).done(df2.resolve).fail(df2.reject);
                    },
                    canSelect: function(f) {
                        return mfs.canMoveTo(i, f);
                    }
                }
            });
            return df2.promise();
        } else
            return mfs._move(i, to);
    };

    mfs._move = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        service.post("filesystem/" + i.id + "/move/", {
            id: to.id,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            events.dispatch('filesystem/move', {
                items: [i],
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                dialogs.confirmation({
                    title: loc.get('moveOverwriteConfirmationTitle'),
                    message: loc.get('moveOverwriteConfirmationMsg', [i.name]),
                    callback: function() {
                        mfs._move(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs._moveMany = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        service.post("filesystem/items/", {
            action: 'move',
            items: i,
            to: to,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            events.dispatch('filesystem/move', {
                items: i,
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                var files = e.data.files;

                dialogs.confirmation({
                    title: loc.get(files.length > 1 ? 'moveManyOverwriteConfirmationTitle' : 'moveOverwriteConfirmationTitle'),
                    message: files.length > 1 ? loc.get('moveManyOverwriteConfirmationMsg', [files.length]) : loc.get('moveOverwriteConfirmationMsg', [files[0].name]),
                    callback: function() {
                        mfs._moveMany(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs.rename = function(item, name) {
        if (!name || name.length === 0) {
            var df = $.Deferred();
            dialogs.input({
                title: loc.get(item.is_file ? 'renameDialogTitleFile' : 'renameDialogTitleFolder'),
                message: loc.get('renameDialogNewName'),
                defaultValue: item.name,
                yesTitle: loc.get('renameDialogRenameButton'),
                noTitle: loc.get('dialogCancel'),
                handler: {
                    isAcceptable: function(n) {
                        return !!n && n.length > 0 && n != item.name;
                    },
                    onInput: function(n) {
                        $.when(mfs._rename(item, n)).then(df.resolve, df.reject);
                    }
                }
            });
            return df.promise();
        } else {
            return mfs._rename(item, name);
        }
    };

    mfs._rename = function(item, name) {
        return service.put("filesystem/" + item.id + "/name/", {
            name: name
        }).done(function(r) {
            events.dispatch('filesystem/rename', {
                items: [item],
                name: name
            });
        });
    };

    mfs._validated = function(cbf, args, action, denyMessage, acceptMessage) {
        var df = $.Deferred();
        cbf.apply(mfs, args).done(df.resolve).fail(function(e) {
            // request denied
            if (e.code == 109 && e.data && e.data.items) {
                this.handled = true;
                ui.actions.handleDenied(action, e.data, denyMessage, acceptMessage).done(function(acceptKeys) {
                    var argsWithKeys = args.slice(0);
                    argsWithKeys.push(acceptKeys);

                    cbf.apply(mfs, argsWithKeys).done(df.resolve).fail(df.reject);
                }).fail(function() {
                    df.reject(e);
                });
            } else df.reject(e);
        });
        return df;
    }

    mfs.del = function(i) {
        if (!i) return;

        var df = $.Deferred();
        if (utils.isArray(i) && i.length > 1) {
            mfs._validated(mfs._delMany, [i], "delete", loc.get("actionDeniedDeleteMany", i.length), loc.get("actionAcceptDeleteMany", i.length)).done(df.resolve).fail(df.reject);
            return df.promise();
        }

        if (utils.isArray(i)) i = i[0];
        mfs._validated(mfs._del, [i], "delete", loc.get("actionDeniedDelete", i.name), loc.get("actionAcceptDelete", i.name)).done(df.resolve).fail(df.reject);
        return df.promise();
    };

    mfs._del = function(item, acceptKeys) {
        return service.del("filesystem/" + item.id, acceptKeys ? {
            acceptKeys: acceptKeys
        } : null).done(function(r) {
            events.dispatch('filesystem/delete', {
                items: [item]
            });
        });
    };

    mfs._delMany = function(i, acceptKeys) {
        return service.post("filesystem/items/", {
            action: 'delete',
            items: i,
            acceptKeys: (acceptKeys ? acceptKeys : null)
        }).done(function(r) {
            events.dispatch('filesystem/delete', {
                items: i
            });
        });
    };

    mfs.createFolder = function(folder, name) {
        return service.post("filesystem/" + folder.id + "/folders/", {
            name: name
        }).done(function(r) {
            events.dispatch('filesystem/createfolder', {
                items: [folder],
                name: name
            });
        });
    };

    mfs.getItemDownloadInfo = function(i) {
        if (!i) return false;
        var single = false;

        if (!utils.isArray(i)) single = i;
        else if (i.length === 0) single = i[0];

        if (single && single.is_file) {
            return {
                name: single.name,
                url: mfs.getDownloadUrl(single)
            };
        } else {
            if (!single) return false;

            if (plugins.exists("plugin-archiver")) return {
                name: single.name + ".zip", //TODO get extension from plugin
                url: plugins.get("plugin-archiver").getDownloadCompressedUrl(i)
            };
        }

        return false;
    };

    return mfs;
});
