/**
 * configview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {

    "use strict";

    mollify.view.MainViewConfigView = function() {
        var that = this;
        this.viewId = "admin";

        this._views = [];
        this._adminViews = [];
        this._adminViewsLoaded = false;

        this.init = function(mv) {
            that.title = mollify.ui.texts.get('configviewMenuTitle');
            that.icon = "icon-cogs";

            that._views.push(new mollify.view.config.user.AccountView(mv));

            $.each(mollify.plugins.getConfigViewPlugins(), function(i, p) {
                if (!p.configViewHandler.views) return;

                var views = p.configViewHandler.views();
                if (!views) return;

                $.each(views, function(i, v) {
                    if (v.admin) {
                        if (mollify.session.user.admin || (v.requiresPermission && mollify.session.user.hasPermission(v.requiresPermission)))
                            that._adminViews.push(v);
                    } else
                        that._views.push(v);
                });
            });
        }

        this.onResize = function() {}

        this.onActivate = function(h) {
            mollify.templates.load("configview", mollify.templates.url("configview.html")).done(function() {
                mollify.dom.template("mollify-tmpl-configview").appendTo(h.content);

                that.showLoading(true);

                var navBarItems = [];
                $.each(that._views, function(i, v) {
                    navBarItems.push({
                        title: v.title,
                        obj: v,
                        callback: function() {
                            that._activateView(v);
                        }
                    })
                });

                that._userNav = h.addNavBar({
                    title: mollify.ui.texts.get("configViewUserNavTitle"),
                    items: navBarItems
                });

                that.onResize();

                if (that._adminViewsLoaded) {
                    that._initAdminViews(h);
                } else {
                    that._adminViewsLoaded = true;

                    // default admin views
                    if (mollify.session.user.admin) {
                        that._adminViews.unshift(new mollify.view.config.admin.FoldersView());
                        that._adminViews.unshift(new mollify.view.config.admin.GroupsView());
                        that._adminViews.unshift(new mollify.view.config.admin.UsersView());
                    }

                    var plugins = [];
                    for (var k in mollify.session.plugins) {
                        if (!mollify.session.plugins[k] || !mollify.session.plugins[k].admin) continue;
                        plugins.push(k);
                    }
                    mollify.admin = {
                        plugins: []
                    };
                    that._loadAdminPlugins(plugins).done(function() {
                        that._initAdminViews(h);
                    });
                }
            });
        }

        this._loadAdminPlugins = function(ids) {
            var df = $.Deferred();
            var l = [];
            if (mollify.session.user.admin)
                l.push(mollify.service.get("configuration/settings").done(function(s) {
                    that._settings = s;
                }));
            for (var i = 0, j = ids.length; i < j; i++) {
                l.push(mollify.dom.importScript(mollify.plugins.url(ids[i], "plugin.js", true)));
            }

            $.when.apply($, l).done(function() {
                var o = [];

                var addView = function(i, v) {
                    if (v.requiresPermission) {
                        if (!mollify.session.user.admin && !mollify.session.user.hasPermission(v.requiresPermission)) return;
                    } else {
                        if (!mollify.session.user.admin) return;
                    }
                    that._adminViews.push(v);
                };
                for (var pk in mollify.admin.plugins) {
                    var p = mollify.admin.plugins[pk];
                    if (!p || !p.views) continue;

                    if (p.resources && p.resources.texts)
                        o.push(mollify.ui.texts.loadPlugin(pk));
                    if (p.resources && p.resources.css)
                        o.push(mollify.dom.importCss(mollify.plugins.url(pk, "plugin.css", true)));
                    $.each(p.views, addView);
                }

                $.when.apply($, o).done(df.resolve);
            });
            return df;
        };

        this._initAdminViews = function(h) {
            if (that._adminViews && that._adminViews.length > 0) {
                $.each(that._adminViews, function(i, v) {
                    if (v.init) v.init(that._settings, that);
                });

                var navBarItems = [];
                $.each(that._adminViews, function(i, v) {
                    navBarItems.push({
                        title: v.title,
                        obj: v,
                        callback: function() {
                            that._activateView(v, true);
                        }
                    })
                });

                that._adminNav = h.addNavBar({
                    title: mollify.ui.texts.get("configViewAdminNavTitle"),
                    items: navBarItems
                });
            }

            that._onInitDone(h);
        };

        this._findView = function(id) {
            var found = false;
            $.each(that._views, function(i, v) {
                if (v.viewId == id) {
                    found = {
                        view: v,
                        admin: false
                    };
                    return false;
                }
            });
            if (!found)
                $.each(that._adminViews, function(i, v) {
                    if (v.viewId == id) {
                        found = {
                            view: v,
                            admin: true
                        };
                        return false;
                    }
                });

            return found;
        };

        this._onInitDone = function(h) {
            if (h.id) {
                var view = that._findView(h.id[0]);
                if (view) that._activateView(view.view, view.admin);
            } else
                that._activateView(that._views[0]);
        }

        this.onRestoreView = function(id) {
            var view = that._findView(id[0]);
            if (view) that._activateView(view.view, view.admin, true);
        };

        this._activateView = function(v, admin, noStore) {
            if (that._activeView) {
                if (that._activeView.onDeactivate) that._activeView.onDeactivate();
                if (that._adminNav) that._adminNav.setActive(false);
                that._userNav.setActive(false);
            }
            if (admin) that._adminNav.setActive(v);
            else that._userNav.setActive(v);

            that.showLoading(false);

            that._activeView = v;
            if (!noStore && that._activeView.viewId) mollify.App.storeView("admin/" + that._activeView.viewId);
            $("#mollify-configview-header").html(v.title);
            v.onActivate(that._getContentElement().empty(), that);
        }

        this._getContentElement = function() {
            return $("#mollify-configview-content");
        }

        this.onDeactivate = function() {
            if (that._activeView && that._activeView.onDeactivate) that._activeView.onDeactivate();
        }

        this.showLoading = function(s) {
            if (s) that._getContentElement().find(".mollify-configlistview").addClass("loading");
            else that._getContentElement().find(".mollify-configlistview").removeClass("loading");
        }
    }

    mollify.view.ConfigListView = function($e, o) {
        mollify.dom.template("mollify-tmpl-configlistview", {
            title: o.title,
            actions: o.actions || false
        }).appendTo($e);
        var $table = $e.find(".mollify-configlistview-table");
        var table = mollify.ui.controls.table($table, o.table);
        var enableAction = function(id, e) {
            if (e)
                $e.find("#mollify-configlistview-action-" + id).removeClass("disabled");
            else
                $e.find("#mollify-configlistview-action-" + id).addClass("disabled");
        };
        if (o.actions) {
            $.each(o.actions, function(i, a) {
                if (a.depends) enableAction(a.id, false);
                if (a.tooltip) mollify.ui.controls.tooltip($("#mollify-configlistview-action-" + a.id), {
                    title: a.tooltip
                });
            });

            table.onSelectionChanged(function() {
                var sel = table.getSelected();
                var any = sel.length > 0;
                var one = sel.length == 1;
                var many = sel.length > 1;
                $.each(o.actions, function(i, a) {
                    if (!a.depends) return;
                    if (a.depends == "table-selection") enableAction(a.id, any);
                    else if (a.depends == "table-selection-one") enableAction(a.id, one);
                    else if (a.depends == "table-selection-many") enableAction(a.id, many);
                });
            });
            $e.find(".mollify-configlistview-actions > .mollify-configlistview-action").click(function() {
                if ($(this).hasClass("disabled")) return;
                var action = $(this).tmplItem().data;
                if (!action.callback) return;

                var p;
                if (action.depends && action.depends.startsWith("table-selection")) p = table.getSelected();
                action.callback(p);
            });
        }

        return {
            table: table,
            enableAction: enableAction
        };
    }

    mollify.view.config = {
        user: {},
        admin: {}
    };

    /* Account */
    mollify.view.config.user.AccountView = function(mv) {
        var that = this;
        this.viewId = "account";
        this.title = mollify.ui.texts.get("configUserAccountNavTitle");

        this.onActivate = function($c) {
            mollify.dom.template("mollify-tmpl-config-useraccountview", mollify.session).appendTo($c);
            mollify.ui.process($c, ["localize"]);
            $("#user-account-change-password-btn").click(mv.changePassword);
        }
    }

    /* Users */
    mollify.view.config.admin.UsersView = function() {
        var that = this;
        this.viewId = "users";

        this.init = function(opt, cv) {
            that._cv = cv;
            that.title = mollify.ui.texts.get("configAdminUsersNavTitle");

            that._authenticationOptions = opt.authentication_methods;
            that._authFormatter = function(am) {
                return am; /* TODO */
            }
            that._defaultAuthMethod = opt.authentication_methods[0];
            that._langFormatter = function(l) {
                return mollify.ui.texts.get('language_' + l);
            }
        }

        this.onActivate = function($c) {
            var users = false;
            var listView = false;
            that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), {
                resizable: true
            });

            var getQueryParams = function(i) {
                var params = {
                    criteria: {}
                };

                var name = $("#mollify-admin-user-searchoptions-name").val();
                if (name && name.length > 0) params.criteria.name = name;

                var email = $("#mollify-admin-user-searchoptions-email").val();
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

            listView = new mollify.view.ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: function() {
                        that.onAddEditUser(false, updateUsers);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.ui.dialogs.confirmation({
                            title: mollify.ui.texts.get("configAdminUsersRemoveUsersConfirmationTitle"),
                            message: mollify.ui.texts.get("configAdminUsersRemoveUsersConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeUsers(sel).done(updateUsers);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="icon-refresh"></i>',
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
                        content: '<i class="icon-user"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersNameTitle'),
                        sortable: true
                    }, {
                        id: "user_type",
                        title: mollify.ui.texts.get('configAdminUsersTypeTitle'),
                        sortable: true,
                        valueMapper: function(item, type) {
                            if (type == null) return mollify.ui.texts.get("configAdminUsersTypeNormal");
                            return mollify.ui.texts.get("configAdminUsersType_" + type.toLowerCase());
                        }
                    }, {
                        id: "email",
                        title: mollify.ui.texts.get('configAdminUsersEmailTitle'),
                        sortable: true
                    }, {
                        id: "edit",
                        title: mollify.ui.texts.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="icon-edit"></i>'
                    }, {
                        id: "pw",
                        title: mollify.ui.texts.get('configAdminUsersActionChangePasswordTitle'),
                        type: "action",
                        content: '<i class="icon-key"></i>',
                        enabled: function(u) {
                            var auth = u.auth;
                            if (!auth) auth = that._defaultAuthMethod;
                            return (auth == 'pw');
                        }
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "edit") {
                            mollify.service.get("configuration/users/" + u.id).done(function(user) {
                                that.onAddEditUser(user, updateUsers);
                            });
                        } else if (id == "pw") {
                            that.onChangePassword(u);
                        } else if (id == "remove") {
                            mollify.ui.dialogs.confirmation({
                                title: mollify.ui.texts.get("configAdminUsersRemoveUserConfirmationTitle"),
                                message: mollify.ui.texts.get("configAdminUsersRemoveUserConfirmationMessage", [u.name]),
                                callback: function() {
                                    mollify.service.del("configuration/users/" + u.id).done(updateUsers);
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

            var $options = $c.find(".mollify-configlistview-options");
            mollify.dom.template("mollify-tmpl-config-admin-user-searchoptions").appendTo($options);
            mollify.ui.process($options, ["localize"]);

            var gp = mollify.service.get("configuration/usergroups").done(function(g) {
                that._allGroups = g;
            });
            var fp = mollify.service.get("configuration/folders").done(function(f) {
                that._allFolders = f;
            });
            $.when(gp, fp).done(refresh);
        }

        this.onChangePassword = function(u, cb) {
            var $content = false;
            var $name = false;
            var $password = false;

            mollify.ui.dialogs.custom({
                resizable: true,
                initSize: [600, 200],
                title: mollify.ui.texts.get('configAdminUsersChangePasswordDialogTitle', u.name),
                content: mollify.dom.template("mollify-tmpl-config-admin-userchangepassworddialog", {
                    user: u
                }),
                buttons: [{
                    id: "yes",
                    "title": mollify.ui.texts.get('dialogSave')
                }, {
                    id: "no",
                    "title": mollify.ui.texts.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }

                    var password = $password.val();
                    if (!password || password.length === 0) return;

                    mollify.service.put("configuration/users/" + u.id + "/password", {
                        "new": window.Base64.encode(password)
                    }).done(d.close).done(cb);
                },
                "on-show": function(h, $d) {
                    $("#change-password-title").text(mollify.ui.texts.get('configAdminUsersChangePasswordTitle', u.name));

                    $content = $d.find("#mollify-config-admin-userchangepassworddialog-content");
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

        this.onDeactivate = function() {
            that._details.remove();
        };

        this._showUserDetails = function(u, $e, allGroups, allFolders) {
            mollify.dom.template("mollify-tmpl-config-admin-userdetails", {
                user: u
            }).appendTo($e);
            mollify.ui.process($e, ["localize"]);
            var $groups = $e.find(".mollify-config-admin-userdetails-groups");
            var $folders = $e.find(".mollify-config-admin-userdetails-folders");
            var foldersView = false;
            var groupsView = false;
            var permissionsView = false;
            var folders = false;
            var groups = false;

            var updateGroups = function() {
                $groups.addClass("loading");
                mollify.service.get("configuration/users/" + u.id + "/groups/").done(function(l) {
                    $groups.removeClass("loading");
                    groups = l;
                    groupsView.table.set(groups);
                });
            };
            var updateFolders = function() {
                $folders.addClass("loading");
                mollify.service.get("configuration/users/" + u.id + "/folders/").done(function(l) {
                    $folders.removeClass("loading");
                    folders = l;
                    foldersView.table.set(folders);
                });
            };
            var onAddUserFolders = function() {
                var currentIds = mollify.helpers.extractValue(folders, "id");
                var selectable = mollify.helpers.filter(allFolders, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                mollify.ui.dialogs.select({
                    title: mollify.ui.texts.get('configAdminUserAddFolderTitle'),
                    message: mollify.ui.texts.get('configAdminUserAddFolderMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="icon-folder"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersFolderDefaultNameTitle')
                    }, {
                        id: "user_name",
                        title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'),
                        type: "input"
                    }, {
                        id: "path",
                        title: mollify.ui.texts.get('configAdminFoldersPathTitle')
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
                        mollify.service.post("configuration/users/" + u.id + "/folders/", folders).done(updateFolders);
                    }
                });
            };
            var onAddUserGroups = function() {
                var currentIds = mollify.helpers.extractValue(groups, "id");
                var selectable = mollify.helpers.filter(allGroups, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                mollify.ui.dialogs.select({
                    title: mollify.ui.texts.get('configAdminUserAddGroupTitle'),
                    message: mollify.ui.texts.get('configAdminUserAddGroupMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="icon-folder"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersGroupNameTitle')
                    }, {
                        id: "description",
                        title: mollify.ui.texts.get('configAdminGroupsDescriptionTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        mollify.service.post("configuration/users/" + u.id + "/groups/", mollify.helpers.extractValue(sel, "id")).done(updateGroups);
                    }
                });
            };

            foldersView = new mollify.view.ConfigListView($e.find(".mollify-config-admin-userdetails-folders"), {
                title: mollify.ui.texts.get('configAdminUsersFoldersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: onAddUserFolders
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.service.del("configuration/users/" + u.id + "/folders/", {
                            ids: mollify.helpers.extractValue(sel, "id")
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
                        content: '<i class="icon-folder"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'),
                        formatter: function(f, v) {
                            var n = f.name;
                            if (n && n.length > 0) return n;
                            return mollify.ui.texts.get('configAdminUsersFolderDefaultName', f.default_name);
                        }
                    }, {
                        id: "path",
                        title: mollify.ui.texts.get('configAdminFoldersPathTitle')
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "remove") {
                            mollify.service.del("configuration/users/" + u.id + "/folders/" + f.id).done(updateFolders);
                        }
                    }
                }
            });

            groupsView = new mollify.view.ConfigListView($e.find(".mollify-config-admin-userdetails-groups"), {
                title: mollify.ui.texts.get('configAdminUsersGroupsTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: onAddUserGroups
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.service.del("configuration/users/" + u.id + "/groups/", {
                            ids: mollify.helpers.extractValue(sel, "id")
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
                        content: '<i class="icon-user"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersGroupNameTitle')
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, g) {
                        if (id == "remove") {
                            mollify.service.del("configuration/users/" + u.id + "/groups/" + g.id).done(updateGroups);
                        }
                    }
                }
            });

            mollify.plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".mollify-config-admin-userdetails-permissions"), mollify.ui.texts.get('configAdminUsersPermissionsTitle'), u);

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
            return mollify.service.del("configuration/users", {
                ids: mollify.helpers.extractValue(users, "id")
            });
        }

        this.onAddEditUser = function(u, cb) {
            var $content = false;
            var $name = false;
            var $email = false;
            var $password = false;
            var $type = false;
            var $authentication = false;
            var $language = false;
            var $expiration = false;
            var showLanguages = (mollify.settings.language.options && mollify.settings.language.options.length > 1);

            mollify.ui.dialogs.custom({
                resizable: true,
                initSize: [600, 400],
                title: mollify.ui.texts.get(u ? 'configAdminUsersUserDialogEditTitle' : 'configAdminUsersUserDialogAddTitle'),
                content: mollify.dom.template("mollify-tmpl-config-admin-userdialog", {
                    user: u,
                    showLanguages: showLanguages
                }),
                buttons: [{
                    id: "yes",
                    "title": mollify.ui.texts.get('dialogSave')
                }, {
                    id: "no",
                    "title": mollify.ui.texts.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }
                    var username = $name.val();
                    var email = $email.val();
                    var type = $type.selected();
                    var expiration = mollify.helpers.formatInternalTime($expiration.get());
                    var auth = $authentication.selected();
                    if (!username || username.length === 0) return;
                    var lang = null;
                    if (showLanguages) lang = $language.selected();

                    var effectiveAuth = auth;
                    if (!effectiveAuth) effectiveAuth = that._defaultAuthMethod;

                    var user = {
                        name: username,
                        email: email,
                        user_type: type,
                        expiration: expiration,
                        auth: auth,
                        lang: lang
                    };

                    if (u) {
                        mollify.service.put("configuration/users/" + u.id, user).done(d.close).done(cb);
                    } else {
                        var pwRequired = (effectiveAuth === 'pw');
                        var password = $password.val();
                        if (pwRequired && (!password || password.length === 0)) return;

                        user.password = password ? window.Base64.encode(password) : '';
                        mollify.service.post("configuration/users", user).done(d.close).done(cb);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#mollify-config-admin-userdialog-content");
                    $name = $d.find("#usernameField");
                    $email = $d.find("#emailField");
                    $password = $d.find("#passwordField");
                    $("#generatePasswordBtn").click(function() {
                        $password.val(that._generatePassword());
                        return false;
                    });
                    $type = mollify.ui.controls.select("typeField", {
                        values: ['a'],
                        none: mollify.ui.texts.get('configAdminUsersTypeNormal'),
                        formatter: function(t) {
                            return mollify.ui.texts.get('configAdminUsersType_' + t);
                        }
                    });
                    $authentication = mollify.ui.controls.select("authenticationField", {
                        values: that._authenticationOptions,
                        none: mollify.ui.texts.get('configAdminUsersUserDialogAuthDefault', that._defaultAuthMethod),
                        formatter: that._authFormatter
                    });
                    if (showLanguages)
                        $language = mollify.ui.controls.select("languageField", {
                            values: mollify.settings.language.options,
                            none: mollify.ui.texts.get('configAdminUsersUserDialogLangDefault', (mollify.settings.language["default"] || 'en')),
                            formatter: that._langFormatter
                        });
                    $expiration = mollify.ui.controls.datepicker("expirationField", {
                        format: mollify.ui.texts.get('shortDateTimeFormat'),
                        time: true
                    });

                    if (u) {
                        $name.val(u.name);
                        $email.val(u.email || "");
                        $type.select(u.user_type ? u.user_type.toLowerCase() : null);
                        $authentication.select(u.auth ? u.auth.toLowerCase() : null);
                        $expiration.set(mollify.helpers.parseInternalTime(u.expiration));
                        if (showLanguages && u.lang) $language.select(u.lang);
                    } else {
                        $type.select(null);
                    }
                    $name.focus();

                    h.center();
                }
            });
        }
    }

    /* Groups */
    mollify.view.config.admin.GroupsView = function() {
        var that = this;
        this.viewId = "groups";

        this.init = function(s, cv) {
            that._cv = cv;
            that.title = mollify.ui.texts.get("configAdminGroupsNavTitle");
        }

        this.onActivate = function($c) {
            var groups = false;
            var listView = false;
            that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), {
                resizable: true
            });

            var updateGroups = function() {
                that._details.hide();
                that._cv.showLoading(true);
                mollify.service.get("configuration/usergroups/").done(function(l) {
                    that._cv.showLoading(false);
                    groups = l;
                    listView.table.set(groups);
                });
            };

            listView = new mollify.view.ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: function() {
                        that.onAddEditGroup(false, updateGroups);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.ui.dialogs.confirmation({
                            title: mollify.ui.texts.get("configAdminGroupsRemoveGroupsConfirmationTitle"),
                            message: mollify.ui.texts.get("configAdminGroupsRemoveGroupsConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeGroups(sel).done(updateGroups);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="icon-refresh"></i>',
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
                        content: '<i class="icon-user"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminGroupsNameTitle')
                    }, {
                        id: "description",
                        title: mollify.ui.texts.get('configAdminGroupsDescriptionTitle')
                    }, {
                        id: "edit",
                        title: mollify.ui.texts.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="icon-edit"></i>'
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, g) {
                        if (id == "edit") {
                            that.onAddEditGroup(g, updateGroups);
                        } else if (id == "remove") {
                            mollify.ui.dialogs.confirmation({
                                title: mollify.ui.texts.get("configAdminGroupsRemoveGroupConfirmationTitle"),
                                message: mollify.ui.texts.get("configAdminGroupsRemoveGroupConfirmationMessage", [g.name]),
                                callback: function() {
                                    mollify.service.del("configuration/usergroups/" + g.id).done(updateGroups);
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
            var up = mollify.service.get("configuration/users").done(function(u) {
                that._allUsers = u;
            });
            var fp = mollify.service.get("configuration/folders").done(function(f) {
                that._allFolders = f;
            });
            $.when(up, fp).done(function() {
                that._cv.showLoading(false);
            });
        }

        this.onDeactivate = function() {
            that._details.remove();
        };

        this._showGroupDetails = function(g, $e, allUsers, allFolders) {
            mollify.dom.template("mollify-tmpl-config-admin-groupdetails", {
                group: g
            }).appendTo($e);
            mollify.ui.process($e, ["localize"]);
            var $users = $e.find(".mollify-config-admin-groupdetails-users");
            var $folders = $e.find(".mollify-config-admin-groupdetails-folders");
            var foldersView = false;
            var usersView = false;
            var folders = false;
            var users = false;

            var updateUsers = function() {
                $users.addClass("loading");
                mollify.service.get("configuration/usergroups/" + g.id + "/users/").done(function(l) {
                    $users.removeClass("loading");
                    users = l;
                    usersView.table.set(users);
                });
            };
            var updateFolders = function() {
                $folders.addClass("loading");
                mollify.service.get("configuration/users/" + g.id + "/folders/").done(function(l) {
                    $folders.removeClass("loading");
                    folders = l;
                    foldersView.table.set(folders);
                });
            };
            var onAddGroupUsers = function() {
                var currentIds = mollify.helpers.extractValue(users, "id");
                var selectable = mollify.helpers.filter(allUsers, function(u) {
                    return u.is_group == 0 && currentIds.indexOf(u.id) < 0;
                });
                //if (selectable.length === 0) return;

                mollify.ui.dialogs.select({
                    title: mollify.ui.texts.get('configAdminGroupAddUserTitle'),
                    message: mollify.ui.texts.get('configAdminGroupAddUserMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="icon-folder"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersNameTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        mollify.service.post("configuration/usergroups/" + g.id + "/users/", mollify.helpers.extractValue(sel, "id")).done(updateUsers);
                    }
                });
            };
            var onAddGroupFolders = function() {
                var currentIds = mollify.helpers.extractValue(folders, "id");
                var selectable = mollify.helpers.filter(allFolders, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                mollify.ui.dialogs.select({
                    title: mollify.ui.texts.get('configAdminGroupAddFolderTitle'),
                    message: mollify.ui.texts.get('configAdminGroupAddFolderMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="icon-folder"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersFolderDefaultNameTitle')
                    }, {
                        id: "user_name",
                        title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'),
                        type: "input"
                    }, {
                        id: "path",
                        title: mollify.ui.texts.get('configAdminFoldersPathTitle')
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
                        mollify.service.post("configuration/users/" + g.id + "/folders/", folders).done(updateFolders);
                    }
                });
            };

            foldersView = new mollify.view.ConfigListView($folders, {
                title: mollify.ui.texts.get('configAdminGroupsFoldersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: onAddGroupFolders
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.service.del("configuration/users/" + g.id + "/folders/", {
                            ids: mollify.helpers.extractValue(sel, "id")
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
                        content: '<i class="icon-folder"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersFolderNameTitle'),
                        valueMapper: function(f, v) {
                            var n = f.name;
                            if (n && n.length > 0) return n;
                            return mollify.ui.texts.get('configAdminUsersFolderDefaultName', f.default_name);
                        }
                    }, {
                        id: "path",
                        title: mollify.ui.texts.get('configAdminFoldersPathTitle')
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "remove") {
                            mollify.service.del("configuration/users/" + g.id + "/folders/" + f.id).done(updateFolders);
                        }
                    }
                }
            });

            usersView = new mollify.view.ConfigListView($users, {
                title: mollify.ui.texts.get('configAdminGroupsUsersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: onAddGroupUsers
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.service.post("configuration/usergroups/" + g.id + "/remove_users/", mollify.helpers.extractValue(sel, "id")).done(updateUsers);
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
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUsersNameTitle')
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "remove") {
                            mollify.service.post("configuration/usergroups/" + g.id + "/remove_users/", [u.id]).done(updateUsers);
                        }
                    }
                }
            });

            mollify.plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".mollify-config-admin-groupdetails-permissions"), mollify.ui.texts.get('configAdminGroupsPermissionsTitle'), g);

            updateUsers();
            updateFolders();
        }

        this._removeGroups = function(groups) {
            return mollify.service.del("configuration/usergroups", {
                ids: mollify.helpers.extractValue(groups, "id")
            });
        }

        this.onAddEditGroup = function(g, cb) {
            var $content = false;
            var $name = false;
            var $description = false;

            mollify.ui.dialogs.custom({
                resizable: true,
                initSize: [600, 400],
                title: mollify.ui.texts.get(g ? 'configAdminGroupsDialogEditTitle' : 'configAdminGroupsDialogAddTitle'),
                content: mollify.dom.template("mollify-tmpl-config-admin-groupdialog", {
                    group: g
                }),
                buttons: [{
                    id: "yes",
                    "title": mollify.ui.texts.get('dialogSave')
                }, {
                    id: "no",
                    "title": mollify.ui.texts.get('dialogCancel')
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
                        mollify.service.put("configuration/usergroups/" + g.id, group).done(d.close).done(cb);
                    } else {
                        mollify.service.post("configuration/usergroups", group).done(d.close).done(cb);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#mollify-config-admin-groupdialog-content");
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
    }

    /* Folders */
    mollify.view.config.admin.FoldersView = function() {
        var that = this;
        this.viewId = "folders";

        this.init = function(s, cv) {
            that._cv = cv;
            that._settings = s;
            that.title = mollify.ui.texts.get("configAdminFoldersNavTitle");
        }

        this.onActivate = function($c) {
            var folders = false;
            var listView = false;
            that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), {
                resizable: true
            });

            var updateFolders = function() {
                that._cv.showLoading(true);

                mollify.service.get("configuration/folders/").done(function(l) {
                    that._cv.showLoading(false);
                    folders = l;
                    listView.table.set(folders);
                });
            };

            listView = new mollify.view.ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: function() {
                        that.onAddEditFolder(false, updateFolders);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.ui.dialogs.confirmation({
                            title: mollify.ui.texts.get("configAdminFoldersRemoveFoldersConfirmationTitle"),
                            message: mollify.ui.texts.get("configAdminFoldersRemoveFoldersConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeFolders(sel).done(updateFolders);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="icon-refresh"></i>',
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
                        content: '<i class="icon-folder-close"></i>'
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminFoldersNameTitle')
                    }, {
                        id: "path",
                        title: mollify.ui.texts.get('configAdminFoldersPathTitle')
                    }, {
                        id: "edit",
                        title: mollify.ui.texts.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="icon-edit"></i>'
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "edit") {
                            that.onAddEditFolder(f, updateFolders);
                        } else if (id == "remove") {
                            mollify.ui.dialogs.confirmation({
                                title: mollify.ui.texts.get("configAdminFoldersRemoveFolderConfirmationTitle"),
                                message: mollify.ui.texts.get("configAdminFoldersRemoveFolderConfirmationMessage", [f.name]),
                                options: {
                                    deleteContents: mollify.ui.texts.get("configAdminFoldersRemoveFolderContentConfirmation")
                                },
                                callback: function(opts) {
                                    var p = "configuration/folders/" + f.id;
                                    if (opts.deleteContents) p += '?delete=true'
                                    mollify.service.del(p).done(function(f) {
                                        mollify.filesystem.updateRoots(f.folders, f.roots);
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
            var gp = mollify.service.get("configuration/usersgroups").done(function(r) {
                that._allUsers = r.users;
                that._allGroups = r.groups;
                that._cv.showLoading(false);
            });
        }

        this.onDeactivate = function() {
            that._details.remove();
        };

        this._showFolderDetails = function(f, $e, allUsers, allGroups) {
            mollify.dom.template("mollify-tmpl-config-admin-folderdetails", {
                folder: f
            }).appendTo($e);
            mollify.ui.process($e, ["localize"]);
            var $usersAndGroups = $e.find(".mollify-config-admin-folderdetails-usersandgroups");
            var usersAndGroupsView = false;
            var usersAndGroups = false;
            var allUsersAndGroups = allUsers.concat(allGroups);

            var updateUsersAndGroups = function() {
                $usersAndGroups.addClass("loading");
                mollify.service.get("configuration/folders/" + f.id + "/users/").done(function(l) {
                    $usersAndGroups.removeClass("loading");
                    usersAndGroups = l;
                    usersAndGroupsView.table.set(l);
                });
            };
            var onAddUserGroup = function() {
                var currentIds = mollify.helpers.extractValue(usersAndGroups, "id");
                var selectable = mollify.helpers.filter(allUsersAndGroups, function(ug) {
                    return currentIds.indexOf(ug.id) < 0;
                });
                //if (selectable.length === 0) return;

                mollify.ui.dialogs.select({
                    title: mollify.ui.texts.get('configAdminFolderAddUserTitle'),
                    message: mollify.ui.texts.get('configAdminFolderAddUserMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        valueMapper: function(i, v) {
                            if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>";
                            return "<i class='icon-user'></i>";
                        }
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        mollify.service.post("configuration/folders/" + f.id + "/users/", mollify.helpers.extractValue(sel, "id")).done(function(f) {
                            mollify.filesystem.updateRoots(f.folders, f.roots);
                            updateUsersAndGroups()
                        });
                    }
                });
            }

            usersAndGroupsView = new mollify.view.ConfigListView($usersAndGroups, {
                title: mollify.ui.texts.get('configAdminFolderUsersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="icon-plus"></i>',
                    callback: onAddUserGroup
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        mollify.service.post("configuration/folders/" + f.id + "/remove_users/", mollify.helpers.extractValue(sel, "id")).done(function(f) {
                            mollify.filesystem.updateRoots(f.folders, f.roots);
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
                            if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>";
                            return "<i class='icon-user'></i>";
                        }
                    }, {
                        id: "id",
                        title: mollify.ui.texts.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle')
                    }, {
                        id: "remove",
                        title: mollify.ui.texts.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="icon-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "remove") {
                            mollify.service.post("configuration/folders/" + f.id + "/remove_users/", [u.id]).done(updateUsersAndGroups);
                        }
                    }
                }
            });

            updateUsersAndGroups();
        }

        this._removeFolders = function(f) {
            return mollify.service.del("configuration/folders", {
                ids: mollify.helpers.extractValue(f, "id")
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

            mollify.ui.dialogs.custom({
                resizable: true,
                initSize: [500, 300],
                title: mollify.ui.texts.get(f ? 'configAdminFoldersFolderDialogEditTitle' : 'configAdminFoldersFolderDialogAddTitle'),
                content: mollify.dom.template("mollify-tmpl-config-admin-folderdialog", {
                    folder: f
                }),
                buttons: [{
                    id: "yes",
                    "title": mollify.ui.texts.get('dialogSave')
                }, {
                    id: "no",
                    "title": mollify.ui.texts.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }
                    $content.find(".control-group").removeClass("error");

                    var name = $name.val();
                    if (!name) $name.closest(".control-group").addClass("error");

                    var path = $path.val();
                    var pathValid = that._isValidPath(path);
                    if (!pathValid) $path.closest(".control-group").addClass("error");

                    if (!name) {
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

                            mollify.ui.dialogs.confirmation({
                                title: mollify.ui.texts.get('configAdminFoldersFolderDialogAddTitle'),
                                message: mollify.ui.texts.get('configAdminFoldersFolderDialogAddFolderDoesNotExist'),
                                callback: function() {
                                    folder.create = true;
                                    if (!f)
                                        mollify.service.post("configuration/folders", folder).done(d.close).done(cb);
                                    else
                                        mollify.service.put("configuration/folders/" + f.id, folder).done(d.close).done(cb);
                                }
                            });
                        }
                    };
                    if (f) {
                        mollify.service.put("configuration/folders/" + f.id, folder).done(d.close).done(cb).fail(onFail);
                    } else {
                        mollify.service.post("configuration/folders", folder).done(d.close).done(cb).fail(onFail);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#mollify-config-admin-folderdialog-content");
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
    }

}(window.jQuery, window.mollify);
