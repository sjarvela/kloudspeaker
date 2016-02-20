define(['kloudspeaker/session', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/localization', 'kloudspeaker/ui/views', 'kloudspeaker/ui/config/listview'], function(session, plugins, service, utils, ui, controls, dialogs, dom, loc, views, ConfigListView) {
    return function(ctx) {
        var that = this;

        that._authenticationOptions = ctx.settings.authentication_methods;
        that._authFormatter = function(am) {
            return am; /* TODO */
        }
        that._defaultAuthMethod = ctx.settings.authentication_methods[0];
        that._langFormatter = function(l) {
            return loc.get('language_' + l);
        }

        that.init = function($c) {
            var users = false;
            var listView = false;
            that._details = controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), {
                resizable: true
            });

            var getQueryParams = function(i) {
                var params = {
                    criteria: {}
                };

                var name = $("#kloudspeaker-admin-user-searchoptions-name").val();
                if (name && name.length > 0) params.criteria.name = name;

                var email = $("#kloudspeaker-admin-user-searchoptions-email").val();
                if (email && email.length > 0) params.criteria.email = email;

                return params;
            }

            var refresh = function() {
                that._cv.showLoading(true);
                listView.table.refresh().done(function() {
                    that._cv.showLoading(false);
                });
            };

            var updateUsers = function() {
                that._details.hide();
                refresh();
            };

            listView = new ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: function() {
                        that.onAddEditUser(false, updateUsers);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        dialogs.confirmation({
                            title: loc.get("configAdminUsersRemoveUsersConfirmationTitle"),
                            message: loc.get("configAdminUsersRemoveUsersConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeUsers(sel).done(updateUsers);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="fa fa-refresh"></i>',
                    callback: refresh
                }],
                table: {
                    id: "config-admin-users",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    remote: {
                        path: "configuration/users/query",
                        paging: {
                            max: 50
                        },
                        queryParams: getQueryParams,
                        onLoad: function(pr) {
                            $c.addClass("loading");
                            pr.done(function() {
                                $c.removeClass("loading");
                            });
                        }
                    },
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
                        title: loc.get('configAdminUsersNameTitle'),
                        sortable: true
                    }, {
                        id: "user_type",
                        title: loc.get('configAdminUsersTypeTitle'),
                        sortable: true,
                        valueMapper: function(item, type) {
                            if (type == null) return loc.get("configAdminUsersTypeNormal");
                            return loc.get("configAdminUsersType_" + type.toLowerCase());
                        }
                    }, {
                        id: "email",
                        title: loc.get('configAdminUsersEmailTitle'),
                        sortable: true
                    }, {
                        id: "edit",
                        title: loc.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="fa fa-edit"></i>'
                    }, {
                        id: "pw",
                        title: loc.get('configAdminUsersActionChangePasswordTitle'),
                        type: "action",
                        content: '<i class="fa fa-key"></i>',
                        enabled: function(u) {
                            var auth = u.auth;
                            if (!auth) auth = that._defaultAuthMethod;
                            return (auth == 'pw');
                        }
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "edit") {
                            that.onAddEditUser(u.id, updateUsers);
                        } else if (id == "pw") {
                            that.onChangePassword(u);
                        } else if (id == "remove") {
                            dialogs.confirmation({
                                title: loc.get("configAdminUsersRemoveUserConfirmationTitle"),
                                message: loc.get("configAdminUsersRemoveUserConfirmationMessage", [u.name]),
                                callback: function() {
                                    service.del("configuration/users/" + u.id).done(updateUsers);
                                }
                            });
                        }
                    },
                    onHilight: function(u) {
                        if (u) {
                            that._showUserDetails(u, that._details.getContentElement().empty(), that._allGroups, that._allFolders);
                            that._details.show(false, 400);
                        } else {
                            that._details.hide();
                        }
                    }
                }
            });

            that._cv.showLoading(true);

            var $options = $c.find(".kloudspeaker-configlistview-options");
            dom.template("kloudspeaker-tmpl-config-admin-user-searchoptions").appendTo($options);
            ui.process($options, ["localize"]);

            var gp = service.get("configuration/usergroups").done(function(g) {
                that._allGroups = g;
            });
            var fp = service.get("configuration/folders").done(function(f) {
                that._allFolders = f;
            });
            $.when(gp, fp).done(refresh);
        };

        this.onChangePassword = function(u, cb) {
            var $content = false;
            var $name = false;
            var $password = false;

            dialogs.custom({
                resizable: true,
                initSize: [600, 200],
                title: loc.get('configAdminUsersChangePasswordDialogTitle', u.name),
                content: dom.template("kloudspeaker-tmpl-config-admin-userchangepassworddialog", {
                    user: u
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

                    var password = $password.val();
                    if (!password || password.length === 0) return;

                    service.put("configuration/users/" + u.id + "/password", {
                        "new": utils.Base64.encode(password)
                    }).done(d.close).done(cb);
                },
                "on-show": function(h, $d) {
                    $("#change-password-title").text(loc.get('configAdminUsersChangePasswordTitle', u.name));

                    $content = $d.find("#kloudspeaker-config-admin-userchangepassworddialog-content");
                    $password = $d.find("#passwordField");
                    $("#generatePasswordBtn").click(function() {
                        $password.val(that._generatePassword());
                        return false;
                    });

                    $password.focus();
                    h.center();
                }
            });
        };

        this._showUserDetails = function(u, $e, allGroups, allFolders) {
            dom.template("kloudspeaker-tmpl-config-admin-userdetails", {
                user: u
            }).appendTo($e);
            ui.process($e, ["localize"]);
            var $groups = $e.find(".kloudspeaker-config-admin-userdetails-groups");
            var $folders = $e.find(".kloudspeaker-config-admin-userdetails-folders");
            var foldersView = false;
            var groupsView = false;
            var permissionsView = false;
            var folders = false;
            var groups = false;

            var updateGroups = function() {
                $groups.addClass("loading");
                service.get("configuration/users/" + u.id + "/groups/").done(function(l) {
                    $groups.removeClass("loading");
                    groups = l;
                    groupsView.table.set(groups);
                });
            };
            var updateFolders = function() {
                $folders.addClass("loading");
                service.get("configuration/users/" + u.id + "/folders/").done(function(l) {
                    $folders.removeClass("loading");
                    folders = l;
                    foldersView.table.set(folders);
                });
            };
            var onAddUserFolders = function() {
                var currentIds = utils.extractValue(folders, "id");
                var selectable = utils.filter(allFolders, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminUserAddFolderTitle'),
                    message: loc.get('configAdminUserAddFolderMessage'),
                    key: "id",
                    initSize: [600, 400],
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
                        title: loc.get('configAdminUsersFolderNameTitle'),
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
                        service.post("configuration/users/" + u.id + "/folders/", folders).done(updateFolders);
                    }
                });
            };
            var onAddUserGroups = function() {
                var currentIds = utils.extractValue(groups, "id");
                var selectable = utils.filter(allGroups, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminUserAddGroupTitle'),
                    message: loc.get('configAdminUserAddGroupMessage'),
                    key: "id",
                    initSize: [600, 400],
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
                        title: loc.get('configAdminUsersGroupNameTitle')
                    }, {
                        id: "description",
                        title: loc.get('configAdminGroupsDescriptionTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        service.post("configuration/users/" + u.id + "/groups/", utils.extractValue(sel, "id")).done(updateGroups);
                    }
                });
            };

            foldersView = new ConfigListView($e.find(".kloudspeaker-config-admin-userdetails-folders"), {
                title: loc.get('configAdminUsersFoldersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddUserFolders
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.del("configuration/users/" + u.id + "/folders/", {
                            ids: utils.extractValue(sel, "id")
                        }).done(updateFolders);
                    }
                }],
                table: {
                    id: "config-admin-userfolders",
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
                        formatter: function(f, v) {
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
                            service.del("configuration/users/" + u.id + "/folders/" + f.id).done(updateFolders);
                        }
                    }
                }
            });

            groupsView = new ConfigListView($e.find(".kloudspeaker-config-admin-userdetails-groups"), {
                title: loc.get('configAdminUsersGroupsTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddUserGroups
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.del("configuration/users/" + u.id + "/groups/", {
                            ids: utils.extractValue(sel, "id")
                        }).done(updateGroups);
                    }
                }],
                table: {
                    id: "config-admin-usergroups",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-user"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersGroupNameTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, g) {
                        if (id == "remove") {
                            service.del("configuration/users/" + u.id + "/groups/" + g.id).done(updateGroups);
                        }
                    }
                }
            });

            plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".kloudspeaker-config-admin-userdetails-permissions"), loc.get('configAdminUsersPermissionsTitle'), u);

            updateGroups();
            updateFolders();
        }

        this._generatePassword = function() {
            var length = 8;
            var password = '';
            var c;

            for (var i = 0; i < length; i++) {
                while (true) {
                    c = (parseInt(Math.random() * 1000, 10) % 94) + 33;
                    if (that._isValidPasswordChar(c)) break;
                }
                password += String.fromCharCode(c);
            }
            return password;
        }

        this._isValidPasswordChar = function(c) {
            if (c >= 33 && c <= 47) return false;
            if (c >= 58 && c <= 64) return false;
            if (c >= 91 && c <= 96) return false;
            if (c >= 123 && c <= 126) return false;
            return true;
        }

        this._removeUsers = function(users) {
            return service.del("configuration/users", {
                ids: utils.extractValue(users, "id")
            });
        }

        this.onAddEditUser = function(userId, cb) {
            dialogs.custom({
                title: loc.get(userId ? 'configAdminUsersUserDialogEditTitle' : 'configAdminUsersUserDialogAddTitle'),
                model: ['kloudspeaker/config/user/addedit', {
                    userId: userId,
                    authenticationOptions: that._authenticationOptions
                }],
                view: 'templates/kloudspeaker/config/user/addedit',
                buttons: [{
                    id: "yes",
                    "title": loc.get('dialogSave')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }]
            }).done(cb);
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
