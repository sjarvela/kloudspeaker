define(['kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/localization', 'kloudspeaker/ui/views', 'kloudspeaker/ui/config/listview'], function(session, service, fs, utils, ui, controls, dialogs, dom, loc, views, ConfigListView) {
    return function(ctx) {
        var that = this;
        that._settings = ctx.settings;

        that.init = function($c) {
            var folders = false;
            var listView = false;
            that._details = controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), {
                resizable: true
            });

            var updateFolders = function() {
                that._cv.showLoading(true);

                service.get("configuration/folders/").done(function(l) {
                    that._cv.showLoading(false);
                    folders = l;
                    listView.table.set(folders);
                });
            };

            listView = new ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: function() {
                        that.onAddEditFolder(false, updateFolders);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        dialogs.confirmation({
                            title: loc.get("configAdminFoldersRemoveFoldersConfirmationTitle"),
                            message: loc.get("configAdminFoldersRemoveFoldersConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeFolders(sel).done(updateFolders);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="fa fa-refresh"></i>',
                    callback: updateFolders
                }],
                table: {
                    id: "config-admin-folders",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminFoldersNameTitle')
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }, {
                        id: "edit",
                        title: loc.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="fa fa-edit"></i>'
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "edit") {
                            that.onAddEditFolder(f, updateFolders);
                        } else if (id == "remove") {
                            dialogs.confirmation({
                                title: loc.get("configAdminFoldersRemoveFolderConfirmationTitle"),
                                message: loc.get("configAdminFoldersRemoveFolderConfirmationMessage", [f.name]),
                                options: {
                                    deleteContents: loc.get("configAdminFoldersRemoveFolderContentConfirmation")
                                },
                                callback: function(opts) {
                                    var p = "configuration/folders/" + f.id;
                                    if (opts.deleteContents) p += '?delete=true'
                                    service.del(p).done(function(f) {
                                        fs.updateRoots(f.folders, f.roots);
                                        updateFolders();
                                    });
                                }
                            });
                        }
                    },
                    onHilight: function(f) {
                        if (f) {
                            that._showFolderDetails(f, that._details.getContentElement().empty(), that._allGroups, that._allUsers);
                            that._details.show(false, 400);
                        } else {
                            that._details.hide();
                        }
                    }
                }
            });
            updateFolders();

            that._cv.showLoading(true);
            var gp = service.get("configuration/usersgroups").done(function(r) {
                that._allUsers = r.users;
                that._allGroups = r.groups;
                that._cv.showLoading(false);
            });
        };

        this._showFolderDetails = function(f, $e, allUsers, allGroups) {
            dom.template("kloudspeaker-tmpl-config-admin-folderdetails", {
                folder: f
            }).appendTo($e);
            ui.process($e, ["localize"]);
            var $usersAndGroups = $e.find(".kloudspeaker-config-admin-folderdetails-usersandgroups");
            var usersAndGroupsView = false;
            var usersAndGroups = false;
            var allUsersAndGroups = allUsers.concat(allGroups);

            var updateUsersAndGroups = function() {
                $usersAndGroups.addClass("loading");
                service.get("configuration/folders/" + f.id + "/users/").done(function(l) {
                    $usersAndGroups.removeClass("loading");
                    usersAndGroups = l;
                    usersAndGroupsView.table.set(l);
                });
            };
            var onAddUserGroup = function() {
                var currentIds = utils.extractValue(usersAndGroups, "id");
                var selectable = utils.filter(allUsersAndGroups, function(ug) {
                    return currentIds.indexOf(ug.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminFolderAddUserTitle'),
                    message: loc.get('configAdminFolderAddUserMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        valueMapper: function(i, v) {
                            if (i.is_group == 1) return "<i class='fa fa-user'></i><i class='fa fa-user'></i>";
                            return "<i class='fa fa-user'></i>";
                        }
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUserDialogUsernameTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        service.post("configuration/folders/" + f.id + "/users/", utils.extractValue(sel, "id")).done(function(f) {
                            fs.updateRoots(f.folders, f.roots);
                            updateUsersAndGroups()
                        });
                    }
                });
            }

            usersAndGroupsView = new ConfigListView($usersAndGroups, {
                title: loc.get('configAdminFolderUsersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddUserGroup
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.post("configuration/folders/" + f.id + "/remove_users/", utils.extractValue(sel, "id")).done(function(f) {
                            fs.updateRoots(f.folders, f.roots);
                            updateUsersAndGroups();
                        });
                    }
                }],
                table: {
                    id: "config-admin-folderusers",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        valueMapper: function(i, v) {
                            if (i.is_group == 1) return "<i class='fa fa-user'></i><i class='fa fa-user'></i>";
                            return "<i class='fa fa-user'></i>";
                        }
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUserDialogUsernameTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "remove") {
                            service.post("configuration/folders/" + f.id + "/remove_users/", [u.id]).done(updateUsersAndGroups);
                        }
                    }
                }
            });

            updateUsersAndGroups();
        }

        this._removeFolders = function(f) {
            return service.del("configuration/folders", {
                ids: utils.extractValue(f, "id")
            });
        }

        this._isValidPath = function(p) {
            if (!p) return false;
            if (p.indexOf("..") >= 0) return false;
            if (that._settings.published_folders_root) {
                // if root setting is defined, prevent using absolute paths
                if (p.indexOf("/") === 0 || p.indexOf(":\\") === 0) return false;
            }
            return true;
        }

        this.onAddEditFolder = function(f, cb) {
            var $content = false;
            var $name = false;
            var $path = false;

            dialogs.custom({
                resizable: true,
                initSize: [500, 300],
                title: loc.get(f ? 'configAdminFoldersFolderDialogEditTitle' : 'configAdminFoldersFolderDialogAddTitle'),
                content: dom.template("kloudspeaker-tmpl-config-admin-folderdialog", {
                    folder: f
                }),
                buttons: [{
                    id: "yes",
                    "title": loc.get('dialogSave')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }
                    $content.find(".control-group").removeClass("error");

                    var name = $name.val();
                    var invalidName = !name || name.contains('/') || name.contains('\\');
                    if (invalidName) $name.closest(".control-group").addClass("error");

                    var path = $path.val();
                    var pathValid = that._isValidPath(path);
                    if (!pathValid) $path.closest(".control-group").addClass("error");

                    if (invalidName) {
                        $name.focus();
                        return;
                    }
                    if (!pathValid) {
                        $path.focus();
                        return;
                    }

                    var folder = {
                        name: name,
                        path: path
                    };
                    var onFail = function(e) {
                        if (e.code == 105 && !f) {
                            this.handled = true;

                            dialogs.confirmation({
                                title: loc.get('configAdminFoldersFolderDialogAddTitle'),
                                message: loc.get('configAdminFoldersFolderDialogAddFolderDoesNotExist'),
                                callback: function() {
                                    folder.create = true;
                                    if (!f)
                                        service.post("configuration/folders", folder).done(d.close).done(cb);
                                    else
                                        service.put("configuration/folders/" + f.id, folder).done(d.close).done(cb);
                                }
                            });
                        }
                    };
                    if (f) {
                        service.put("configuration/folders/" + f.id, folder).done(d.close).done(cb).fail(onFail);
                    } else {
                        service.post("configuration/folders", folder).done(d.close).done(cb).fail(onFail);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#kloudspeaker-config-admin-folderdialog-content");
                    $name = $d.find("#nameField");
                    $path = $d.find("#pathField");

                    if (f) {
                        $name.val(f.name);
                        $path.val(f.path);
                    }
                    $name.focus();

                    h.center();
                }
            });
        }

        return {
            attached: function($t, $c) {
                that._cv = views.getActiveConfigView();
                that.init($c);
            },
            onDeactivate: function() {
                if (that._details) {
                    that._details.remove();
                    that._details = false;
                }
            }
        };
    };
});
