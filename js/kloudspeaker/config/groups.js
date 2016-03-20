define(['kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/localization', 'kloudspeaker/ui/views', 'kloudspeaker/plugins', 'kloudspeaker/ui/config/listview'], function(session, service, utils, ui, controls, dialogs, dom, loc, views, plugins, ConfigListView) {
    return function(ctx) {
        var that = this;

        that.init = function($c) {
            var groups = false;
            var listView = false;
            that._details = controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), {
                resizable: true
            });

            var updateGroups = function() {
                that._details.hide();
                that._cv.showLoading(true);
                service.get("configuration/usergroups/").done(function(l) {
                    that._cv.showLoading(false);
                    groups = l;
                    listView.table.set(groups);
                });
            };

            listView = new ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: function() {
                        that.onAddEditGroup(false, updateGroups);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        dialogs.confirmation({
                            title: loc.get("configAdminGroupsRemoveGroupsConfirmationTitle"),
                            message: loc.get("configAdminGroupsRemoveGroupsConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeGroups(sel).done(updateGroups);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="fa fa-refresh"></i>',
                    callback: updateGroups
                }],
                table: {
                    id: "config-admin-groups",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-user"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle'),
                        sortable: true
                    }, {
                        id: "name",
                        title: loc.get('configAdminGroupsNameTitle'),
                        sortable: true
                    }, {
                        id: "description",
                        title: loc.get('configAdminGroupsDescriptionTitle')
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
                    onRowAction: function(id, g) {
                        if (id == "edit") {
                            that.onAddEditGroup(g, updateGroups);
                        } else if (id == "remove") {
                            dialogs.confirmation({
                                title: loc.get("configAdminGroupsRemoveGroupConfirmationTitle"),
                                message: loc.get("configAdminGroupsRemoveGroupConfirmationMessage", [g.name]),
                                callback: function() {
                                    service.del("configuration/usergroups/" + g.id).done(updateGroups);
                                }
                            });
                        }
                    },
                    onHilight: function(u) {
                        if (u) {
                            that._showGroupDetails(u, that._details.getContentElement().empty(), that._allUsers, that._allFolders);
                            that._details.show(false, 400);
                        } else {
                            that._details.hide();
                        }
                    }
                }
            });
            updateGroups();

            that._cv.showLoading(true);
            var up = service.get("configuration/users").done(function(u) {
                that._allUsers = u;
            });
            var fp = service.get("configuration/folders").done(function(f) {
                that._allFolders = f;
            });
            $.when(up, fp).done(function() {
                that._cv.showLoading(false);
            });
        };

        this._showGroupDetails = function(g, $e, allUsers, allFolders) {
            dom.template("kloudspeaker-tmpl-config-admin-groupdetails", {
                group: g
            }).appendTo($e);
            ui.process($e, ["localize"]);
            var $users = $e.find(".kloudspeaker-config-admin-groupdetails-users");
            var $folders = $e.find(".kloudspeaker-config-admin-groupdetails-folders");
            var foldersView = false;
            var usersView = false;
            var folders = false;
            var users = false;

            var updateUsers = function() {
                $users.addClass("loading");
                service.get("configuration/usergroups/" + g.id + "/users/").done(function(l) {
                    $users.removeClass("loading");
                    users = l;
                    usersView.table.set(users);
                });
            };
            var updateFolders = function() {
                $folders.addClass("loading");
                service.get("configuration/users/" + g.id + "/folders/").done(function(l) {
                    $folders.removeClass("loading");
                    folders = l;
                    foldersView.table.set(folders);
                });
            };
            var onAddGroupUsers = function() {
                var currentIds = utils.extractValue(users, "id");
                var selectable = utils.filter(that._allUsers, function(u) {
                    return (u.is_group === 0 || u.is_group === "0") && currentIds.indexOf(u.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminGroupAddUserTitle'),
                    message: loc.get('configAdminGroupAddUserMessage'),
                    key: "id",
                    initSize: [600, 400],
                    resizable: true,
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersNameTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        service.post("configuration/usergroups/" + g.id + "/users/", utils.extractValue(sel, "id")).done(updateUsers);
                    }
                });
            };
            var onAddGroupFolders = function() {
                var currentIds = utils.extractValue(folders, "id");
                var selectable = utils.filter(allFolders, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminGroupAddFolderTitle'),
                    message: loc.get('configAdminGroupAddFolderMessage'),
                    key: "id",
                    initSize: [800, 500],
                    resizable: true,
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersFolderDefaultNameTitle')
                    }, {
                        id: "user_name",
                        title: loc.get('configAdminGroupFolderNameTitle'),
                        type: "input"
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        var folders = [];
                        $.each(sel, function(i, f) {
                            var folder = {
                                id: f.id
                            };
                            var name = o[f.id] ? o[f.id].user_name : false;
                            if (name && f.name != name)
                                folder.name = name;
                            folders.push(folder);
                        });
                        service.post("configuration/users/" + g.id + "/folders/", folders).done(updateFolders);
                    }
                });
            };

            foldersView = new ConfigListView($folders, {
                title: loc.get('configAdminGroupsFoldersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddGroupFolders
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.del("configuration/users/" + g.id + "/folders/", {
                            ids: utils.extractValue(sel, "id")
                        }).done(updateFolders);
                    }
                }],
                table: {
                    id: "config-admin-groupfolders",
                    key: "id",
                    narrow: true,
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
                        title: loc.get('configAdminUsersFolderNameTitle'),
                        valueMapper: function(f, v) {
                            var n = f.name;
                            if (n && n.length > 0) return n;
                            return loc.get('configAdminUsersFolderDefaultName', f.default_name);
                        }
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "remove") {
                            service.del("configuration/users/" + g.id + "/folders/" + f.id).done(updateFolders);
                        }
                    }
                }
            });

            usersView = new ConfigListView($users, {
                title: loc.get('configAdminGroupsUsersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddGroupUsers
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.post("configuration/usergroups/" + g.id + "/remove_users/", utils.extractValue(sel, "id")).done(updateUsers);
                    }
                }],
                table: {
                    id: "config-admin-groupusers",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersNameTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "remove") {
                            service.post("configuration/usergroups/" + g.id + "/remove_users/", [u.id]).done(updateUsers);
                        }
                    }
                }
            });

            plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".kloudspeaker-config-admin-groupdetails-permissions"), loc.get('configAdminGroupsPermissionsTitle'), g);

            updateUsers();
            updateFolders();
        }

        this._removeGroups = function(groups) {
            return service.del("configuration/usergroups", {
                ids: utils.extractValue(groups, "id")
            });
        }

        this.onAddEditGroup = function(g, cb) {
            var $content = false;
            var $name = false;
            var $description = false;

            dialogs.custom({
                resizable: true,
                initSize: [600, 400],
                title: loc.get(g ? 'configAdminGroupsDialogEditTitle' : 'configAdminGroupsDialogAddTitle'),
                content: dom.template("kloudspeaker-tmpl-config-admin-groupdialog", {
                    group: g
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
                    var name = $name.val();
                    if (!name || name.length === 0) return;
                    var desc = $description.val();

                    var group = {
                        name: name,
                        description: desc
                    };

                    if (g) {
                        service.put("configuration/usergroups/" + g.id, group).done(d.close).done(cb);
                    } else {
                        service.post("configuration/usergroups", group).done(d.close).done(cb);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#kloudspeaker-config-admin-groupdialog-content");
                    $name = $d.find("#nameField");
                    $description = $d.find("#descriptionField");

                    if (g) {
                        $name.val(g.name);
                        $description.val(g.description || "");
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
