define([], function() {
    //TODO remove global references

    var mfs = {};

    mfs.init = function(f, allRoots) {
        mfs.permissionCache = {};
        mfs.roots = [];
        mfs.allRoots = false;
        mfs.rootsById = {};
        mfs.rootsByFolderId = {};

        mfs.updateRoots(f, allRoots);
    };

    mfs.updateRoots = function(f, allRoots) {
        if (f && kloudspeaker.session.user) {
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

    mfs.getDownloadUrl = function(item) {
        if (!item.is_file) return false;
        var url = kloudspeaker.service.url("filesystem/" + item.id, true);
        if (kloudspeaker.App.mobile)
            url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
        return url;
    };

    mfs.getUploadUrl = function(folder) {
        if (!folder || folder.is_file) return null;
        return kloudspeaker.service.url("filesystem/" + folder.id + '/files/') + "?format=binary";
    };

    mfs.itemDetails = function(item, data) {
        return kloudspeaker.service.post((item.detailsId ? (item.detailsId + "/details/") : ("filesystem/" + item.id + "/details/")), {
            data: data
        }).done(function(r) {
            if (r.permissions)
                mfs.permissionCache[item.id] = r.permissions;
            if (item.parent_id && r.parent_permissions) mfs.permissionCache[item.parent_id] = r.parent_permissions;
        });
    };

    mfs.folderInfo = function(id, hierarchy, data) {
        return kloudspeaker.service.post("filesystem/" + (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), {
            data: data
        }).done(function(r) {
            mfs.permissionCache[id] = r.permissions;
        });
    };

    mfs.findFolder = function(d, data) {
        return kloudspeaker.service.post("filesystem/find/", {
            folder: d,
            data: data
        });
    };

    mfs.hasPermission = function(item, name, required) {
        if (!kloudspeaker.session.user) return false;
        if (kloudspeaker.session.user.admin) return true;
        return kloudspeaker.helpers.hasPermission(mfs.permissionCache[((typeof(item) === "string") ? item : item.id)], name, required);
    };

    mfs.items = function(parent, files, allRoots) {
        if (parent == null) {
            var df = $.Deferred();
            df.resolve({
                folders: (allRoots && kloudspeaker.session.user.admin) ? mfs.allRoots : mfs.roots,
                files: []
            });
            return df.promise();
        }
        return kloudspeaker.service.get("filesystem/" + parent.id + "/items/?files=" + (files ? '1' : '0'));
    };

    mfs.createEmptyFile = function(parent, name) {
        return kloudspeaker.service.post("filesystem/" + parent.id + "/empty_file", {
            name: name
        }).done(function() {
            kloudspeaker.events.dispatch('filesystem/create_item', {
                parent: parent,
                name: name
            });
        });
    };

    mfs.copy = function(i, to) {
        if (!i) return;

        if (window.isArray(i) && i.length > 1) {
            if (!to) {
                var df = $.Deferred();
                kloudspeaker.ui.dialogs.folderSelector({
                    title: kloudspeaker.ui.texts.get('copyMultipleFileDialogTitle'),
                    message: kloudspeaker.ui.texts.get('copyMultipleFileMessage', [i.length]),
                    actionTitle: kloudspeaker.ui.texts.get('copyFileDialogAction'),
                    handler: {
                        onSelect: function(f) {
                            mfs._validated(mfs._copyMany, [i, f], "copy", kloudspeaker.ui.texts.get("actionDeniedCopyMany", i.length), kloudspeaker.ui.texts.get("actionAcceptCopyMany", i.length)).done(df.resolve).fail(df.reject);
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

        if (window.isArray(i)) i = i[0];

        if (!to) {
            var df2 = $.Deferred();
            kloudspeaker.ui.dialogs.folderSelector({
                title: kloudspeaker.ui.texts.get('copyFileDialogTitle'),
                message: kloudspeaker.ui.texts.get('copyFileMessage', [i.name]),
                actionTitle: kloudspeaker.ui.texts.get('copyFileDialogAction'),
                handler: {
                    onSelect: function(f) {
                        mfs._validated(mfs._copy, [i, f], "copy", kloudspeaker.ui.texts.get("actionDeniedCopy", i.name), kloudspeaker.ui.texts.get("actionAcceptCopy", i.name)).done(df2.resolve).fail(df2.reject);
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
            kloudspeaker.ui.dialogs.input({
                title: kloudspeaker.ui.texts.get('copyHereDialogTitle'),
                message: kloudspeaker.ui.texts.get('copyHereDialogMessage'),
                defaultValue: item.name,
                yesTitle: kloudspeaker.ui.texts.get('copyFileDialogAction'),
                noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
                handler: {
                    isAcceptable: function(n) {
                        return !!n && n.length > 0 && n != item.name;
                    },
                    onInput: function(n) {
                        mfs._validated(mfs._copyHere, [item, n], "copy", kloudspeaker.ui.texts.get("actionDeniedCopy", item.name), kloudspeaker.ui.texts.get("actionAcceptCopy", item.name)).done(df.resolve).fail(df.reject);
                    }
                }
            });
            return df.promise();
        } else {
            return mfs._copyHere(item, name);
        }
    };

    mfs.canCopyTo = function(item, to) {
        if (window.isArray(item)) {
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
        if (window.isArray(item)) {
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
        return kloudspeaker.service.post("filesystem/" + i.id + "/copy/", {
            name: name,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/copy', {
                items: [i],
                name: name
            });
        });
    };

    mfs._copy = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        kloudspeaker.service.post("filesystem/" + i.id + "/copy/", {
            folder: to.id,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/copy', {
                items: [i],
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get('copyOverwriteConfirmationTitle'),
                    message: kloudspeaker.ui.texts.get('copyOverwriteConfirmationMsg', [i.name]),
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
        kloudspeaker.service.post("filesystem/items/", {
            action: 'copy',
            items: i,
            to: to,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/copy', {
                items: i,
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                var files = e.data.files;

                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get(files.length > 1 ? 'copyManyOverwriteConfirmationTitle' : 'copyOverwriteConfirmationTitle'),
                    message: files.length > 1 ? kloudspeaker.ui.texts.get('copyManyOverwriteConfirmationMsg', [files.length]) : kloudspeaker.ui.texts.get('copyOverwriteConfirmationMsg', [files[0].name]),
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

        if (window.isArray(i) && i.length > 1) {
            if (!to) {
                var df = $.Deferred();
                kloudspeaker.ui.dialogs.folderSelector({
                    title: kloudspeaker.ui.texts.get('moveMultipleFileDialogTitle'),
                    message: kloudspeaker.ui.texts.get('moveMultipleFileMessage', [i.length]),
                    actionTitle: kloudspeaker.ui.texts.get('moveFileDialogAction'),
                    handler: {
                        onSelect: function(f) {
                            mfs._validated(mfs._moveMany, [i, f], "move", kloudspeaker.ui.texts.get("actionDeniedMoveMany", i.length), kloudspeaker.ui.texts.get("actionAcceptMoveMany", i.length)).done(df.resolve).fail(df.reject);
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

        if (window.isArray(i)) i = i[0];

        if (!to) {
            var df2 = $.Deferred();
            kloudspeaker.ui.dialogs.folderSelector({
                title: kloudspeaker.ui.texts.get('moveFileDialogTitle'),
                message: kloudspeaker.ui.texts.get('moveFileMessage', [i.name]),
                actionTitle: kloudspeaker.ui.texts.get('moveFileDialogAction'),
                handler: {
                    onSelect: function(f) {
                        mfs._validated(mfs._move, [i, f], "move", kloudspeaker.ui.texts.get("actionDeniedMove", i.name), kloudspeaker.ui.texts.get("actionAcceptMove", i.name)).done(df2.resolve).fail(df2.reject);
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
        kloudspeaker.service.post("filesystem/" + i.id + "/move/", {
            id: to.id,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/move', {
                items: [i],
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get('moveOverwriteConfirmationTitle'),
                    message: kloudspeaker.ui.texts.get('moveOverwriteConfirmationMsg', [i.name]),
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
        kloudspeaker.service.post("filesystem/items/", {
            action: 'move',
            items: i,
            to: to,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/move', {
                items: i,
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                var files = e.data.files;

                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get(files.length > 1 ? 'moveManyOverwriteConfirmationTitle' : 'moveOverwriteConfirmationTitle'),
                    message: files.length > 1 ? kloudspeaker.ui.texts.get('moveManyOverwriteConfirmationMsg', [files.length]) : kloudspeaker.ui.texts.get('moveOverwriteConfirmationMsg', [files[0].name]),
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
            kloudspeaker.ui.dialogs.input({
                title: kloudspeaker.ui.texts.get(item.is_file ? 'renameDialogTitleFile' : 'renameDialogTitleFolder'),
                message: kloudspeaker.ui.texts.get('renameDialogNewName'),
                defaultValue: item.name,
                yesTitle: kloudspeaker.ui.texts.get('renameDialogRenameButton'),
                noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
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
        return kloudspeaker.service.put("filesystem/" + item.id + "/name/", {
            name: name
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/rename', {
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
                kloudspeaker.ui.actions.handleDenied(action, e.data, denyMessage, acceptMessage).done(function(acceptKeys) {
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
        if (window.isArray(i) && i.length > 1) {
            mfs._validated(mfs._delMany, [i], "delete", kloudspeaker.ui.texts.get("actionDeniedDeleteMany", i.length), kloudspeaker.ui.texts.get("actionAcceptDeleteMany", i.length)).done(df.resolve).fail(df.reject);
            return df.promise();
        }

        if (window.isArray(i)) i = i[0];
        mfs._validated(mfs._del, [i], "delete", kloudspeaker.ui.texts.get("actionDeniedDelete", i.name), kloudspeaker.ui.texts.get("actionAcceptDelete", i.name)).done(df.resolve).fail(df.reject);
        return df.promise();
    };

    mfs._del = function(item, acceptKeys) {
        return kloudspeaker.service.del("filesystem/" + item.id, acceptKeys ? {
            acceptKeys: acceptKeys
        } : null).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/delete', {
                items: [item]
            });
        });
    };

    mfs._delMany = function(i, acceptKeys) {
        return kloudspeaker.service.post("filesystem/items/", {
            action: 'delete',
            items: i,
            acceptKeys: (acceptKeys ? acceptKeys : null)
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/delete', {
                items: i
            });
        });
    };

    mfs.createFolder = function(folder, name) {
        return kloudspeaker.service.post("filesystem/" + folder.id + "/folders/", {
            name: name
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/createfolder', {
                items: [folder],
                name: name
            });
        });
    };

    return mfs;
});
