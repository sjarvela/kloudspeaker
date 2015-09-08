define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/localization', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/ui/views'], function(settings, plugins, session, service, events, loc, formatters, controls, dialogs, dom, utils, ui, views) {
    //TODO remove reference to global "kloudspeaker"

    var that = {};
    that._permissionTypes = false;

    that.initialize = function() {
        if (that._init) return;

        events.on('session/start', function(e) {
            var s = e.payload;
            if (!that._permissionTypes && s.user) that._permissionTypes = s.data.permission_types;
        });
        that._pathFormatter = new formatters.FilesystemItemPath();
        that._init = true;
    };

    that._formatPermissionName = function(p) {
        var name = loc.get('permission_' + p.name);
        if (p.subject == null && that._permissionTypes.filesystem[p.name])
            return loc.get('permission_default', name);
        return name;
    };

    that._formatPermissionValue = function(name, val) {
        var values = that._getPermissionValues(name);
        if (values)
            return loc.get('permission_' + name + '_value_' + val);
        return loc.get('permission_value_' + val);
    };

    that._getPermissionValues = function(name) {
        return that._permissionTypes.values[name];
    };

    that.editItemPermissions = function(item) {
        var modificationData = {
            "new": [],
            "modified": [],
            "removed": []
        };
        var originalValues = [];
        var $content = false;

        dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            title: loc.get('pluginPermissionsEditDialogTitle', item.name),
            content: dom.template("kloudspeaker-tmpl-permission-editor", {
                item: item
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
                if (modificationData["new"].length === 0 && modificationData.modified.length === 0 && modificationData.removed.length === 0)
                    return;

                service.put("permissions/list", modificationData).done(d.close).fail(d.close);
            },
            "on-show": function(h, $d) {
                $content = $d.find("#kloudspeaker-pluginpermissions-editor-content");
                var $subContents = $content.find(".kloudspeaker-pluginpermissions-editor-subcontent").hide();
                var $activeSubContent = false;
                var activeTab = 0;
                var selectedPermission = false;

                h.center();

                service.get("configuration/users?g=1").done(function(l) {
                    var users = that.processUserData(l);
                    var names = that._permissionTypes.keys.filesystem;
                    var init = 'filesystem_item_access';
                    var onPermissionsModified = function() {
                        var info = (modificationData["new"].length > 0 || modificationData.modified.length > 0 || modificationData.removed.length > 0) ? "<i class='fa fa-exclamation-circle '/>&nbsp;" + loc.get('pluginPermissionsEditDialogUnsaved') : false;
                        h.setInfo(info);
                    };
                    var getPermissionKey = function(p) {
                        return p.user_id + ":" + p.subject + ":" + p.name;
                    };
                    var changes = {
                        addNew: function(p) {
                            if (!p.isnew) return;
                            modificationData["new"].push(p);
                            onPermissionsModified();
                        },
                        remove: function(p) {
                            if (p.isnew) {
                                modificationData["new"].remove(modificationData["new"].indexOf(p));
                            } else {
                                modificationData.removed.push(p);
                            }
                            onPermissionsModified();
                        },
                        update: function(p, v) {
                            if (!p.isnew) {
                                var key = getPermissionKey(p);
                                // store original value
                                if (!originalValues[key]) originalValues[key] = p.value;

                                modificationData.removed.remove(p);

                                var mi = modificationData.modified.indexOf(p);

                                if (originalValues[key] == v) {
                                    if (mi >= 0) modificationData.modified.remove(mi);
                                } else {
                                    if (mi < 0) modificationData.modified.push(p);
                                }
                            }
                            p.value = v;
                            onPermissionsModified();
                        },
                        getNew: function(name) {
                            return $.grep(modificationData["new"], function(p) {
                                return p.name == name;
                            });
                        },
                        findRemoved: function(userId, subject, permissionName) {
                            for (var i = 0, j = modificationData.removed.length; i < j; i++) {
                                var d = modificationData.removed[i];
                                if (d.user_id == userId && d.subject == subject && d.name == permissionName)
                                    return d;
                            }
                            return false;
                        }
                    };

                    var removeAndUpdate = function(list) {
                        var byKey = {};
                        $.each(list, function(i, p) {
                            byKey[getPermissionKey(p)] = p;
                        });
                        //remove
                        for (var i = 0, j = modificationData.removed.length; i < j; i++) {
                            var rp = modificationData.removed[i];
                            var rpk = getPermissionKey(rp);
                            if (rpk in byKey) list.remove(list.indexOf(byKey[rpk]));
                        }
                        //update
                        for (var k = 0, l = modificationData.modified.length; k < l; k++) {
                            var mp = modificationData.modified[k];
                            var mpk = getPermissionKey(mp);
                            if (mpk in byKey) byKey[mpk].value = mp.value;
                        }
                    };

                    var addNewUserAndGroupPermissions = function(list, user, permissionName) {
                        var usersAndGroupsAndItemDefault = [];
                        $.each(list, function(i, p) {
                            if (p.user_id !== 0 && p.user_id != user.id && user.group_ids.indexOf(p.user_id) < 0) return false;
                            usersAndGroupsAndItemDefault.push(p);
                        });
                        $.each(usersAndGroupsAndItemDefault, function(i, p) {
                            list.remove(p);
                        });
                        var newList = [];
                        $.each(changes.getNew(permissionName), function(i, p) {
                            if (p.subject != item.id) return;
                            if (p.user_id === 0 || p.user_id == user.id || user.group_ids.indexOf(p.user_id) >= 0) usersAndGroupsAndItemDefault.push(p);
                        });
                        newList = usersAndGroupsAndItemDefault.concat(list);
                        var indx = function(p) {
                            var i = 0;

                            if (p.subject == item.id) i = 20;
                            else if (p.subject != null && p.subject !== "") i = 10;

                            if (p.user_id == user.id) i = i + 2;
                            else if (user.group_ids.indexOf(p.user_id) >= 0) i = i + 1;

                            return i;
                        };
                        newList = newList.sort(function(a, b) {
                            return indx(b) - indx(a);
                        });

                        return newList;
                    }

                    var activateTab = function(i) {
                        $("#kloudspeaker-pluginpermissions-editor-tab > li").removeClass("active").eq(i).addClass("active");
                        $activeSubContent = $subContents.hide().eq(i).show();
                        activeTab = i;

                        if (i === 0) onActivateItemPermissions($activeSubContent);
                        else onActivateUserPermissions($activeSubContent);
                    };

                    var onChangePermission = function(sel) {
                        selectedPermission = sel;
                        activateTab(activeTab);
                    };

                    controls.select("kloudspeaker-pluginpermissions-editor-permission-name", {
                        onChange: onChangePermission,
                        formatter: function(name) {
                            return loc.get('permission_' + name);
                        },
                        values: names,
                        value: init
                    });

                    $("#kloudspeaker-pluginpermissions-editor-tab > li").click(function() {
                        var i = $(that).addClass("active").index();
                        activateTab(i);
                    });

                    var onActivateItemPermissions = function($sc) {
                        $sc.addClass("loading");

                        that.loadPermissions(item, selectedPermission).done(function(p) {
                            $sc.removeClass("loading");

                            var permissions = p.permissions.slice(0);
                            removeAndUpdate(permissions);
                            permissions = permissions.concat(changes.getNew(selectedPermission));
                            that.initItemPermissionEditor(changes, item, selectedPermission, permissions, users);
                        }).fail(h.close);
                    };

                    var onActivateUserPermissions = function($sc) {
                        var resetUserPermissions = function() {
                            $("#kloudspeaker-pluginpermissions-editor-user-related-permissions").hide();
                            $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html("");
                        }
                        resetUserPermissions();

                        var onChangeUser = function(sel) {
                            resetUserPermissions();
                            if (!sel) return;

                            if (sel.user_type == 'a') {
                                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(loc.get("pluginPermissionsUserPermissionsAdmin"));
                                return;
                            }
                            $sc.addClass("loading");

                            service.get("permissions/user/" + sel.id + "?e=1&subject=" + item.id + "&name=" + selectedPermission).done(function(p) {
                                $sc.removeClass("loading");

                                var permissions = p.permissions.slice(0);
                                removeAndUpdate(permissions);
                                permissions = addNewUserAndGroupPermissions(permissions, sel, selectedPermission);
                                that.initUserPermissionInspector(changes, sel, item, selectedPermission, permissions, p.items, users);
                            }).fail(h.close);
                        };

                        controls.select("kloudspeaker-pluginpermissions-editor-permission-user", {
                            onChange: onChangeUser,
                            none: loc.get("pluginPermissionsEditNoUser"),
                            values: users.users,
                            title: "name"
                        });
                    };

                    onChangePermission(init);
                }).fail(h.close);
            }
        });
    };

    that.processUserData = function(l) {
        var userData = {
            users: [],
            groups: [],
            all: [],
            usersById: {}
        };
        for (var i = 0, j = l.length; i < j; i++) {
            var u = l[i];
            if (u.is_group == "0") {
                userData.users.push(u);
                userData.all.push(u);
                userData.usersById[u.id] = u;
            } else {
                userData.groups.push(u);
                userData.all.push(u);
                userData.usersById[u.id] = u;
            }
        }
        return userData;
    };

    that.loadPermissions = function(item, name, users) {
        return service.get("permissions/list?subject=" + item.id + (name ? "&name=" + name : "") + (users ? "&u=1" : ""));
    };

    that.initUserPermissionInspector = function(changes, user, item, permissionName, relatedPermissions, items, userData) {
        var updateEffectivePermission = function() {
            var ep = false;
            if (relatedPermissions.length > 0) ep = relatedPermissions[0].value;
            if (ep) {
                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(loc.get('pluginPermissionsEffectiveUserPermission', that._formatPermissionValue(permissionName, ep)));
                $("#kloudspeaker-pluginpermissions-editor-user-related-permissions").show();
            } else {
                var values = that._getPermissionValues(permissionName);
                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(loc.get('pluginPermissionsNoEffectiveUserPermission', that._formatPermissionValue(permissionName, values ? values[0] : '0')));
            }
        }
        updateEffectivePermission();
        if (relatedPermissions.length === 0) return;

        var isGroup = function(id) {
            return (id != '0' && userData.usersById[id].is_group != "0");
        };
        var onRemove = function(permission) {
            changes.remove(permission);
            relatedPermissions.remove(permission);
            updateEffectivePermission();
        };

        var $list = controls.table("kloudspeaker-pluginpermissions-editor-user-permission-list", {
            key: "user_id",
            onRow: function($r, i) {
                if (isGroup(i.user_id)) $r.addClass("group");
            },
            columns: [{
                id: "user_id",
                title: loc.get('pluginPermissionsEditColUser'),
                renderer: function(i, v, $c) {
                    if (v == '0' && i.subject === '') return;
                    if (v == '0') {
                        $c.html("<em>" + loc.get('pluginPermissionsEditDefaultPermission') + "</em>");
                        return;
                    }
                    $c.html(userData.usersById[v].name).addClass("user");
                }
            }, {
                id: "value",
                title: loc.get('pluginPermissionsPermissionValue'),
                formatter: function(item, k) {
                    return that._formatPermissionValue(permissionName, k);
                }
            }, {
                id: "subject",
                title: loc.get('pluginPermissionsEditColSource'),
                renderer: function(i, s, $c) {
                    var subject = items[s];
                    if (!subject) {
                        var n = loc.get("permission_system_default");
                        if (i.user_id != '0') {
                            var user = userData.usersById[i.user_id];
                            n = loc.get((user.is_group == '1' ? "permission_group_default" : "permission_user_default"));
                        }
                        $c.html("<em>" + n + "</em>");
                    } else {
                        if (subject.id == item.id) {
                            $c.html('<i class="fa fa-file-o"/>&nbsp;' + loc.get('pluginPermissionsEditColItemCurrent'));
                        } else {
                            var level = Math.max(item.path.count("/"), item.path.count("\\")) - Math.max(subject.path.count("/"), subject.path.count("\\")) + 1;
                            $c.html('<i class="fa fa-file-o"/>&nbsp;' + loc.get('pluginPermissionsEditColItemParent', level));
                        }
                        $c.tooltip({
                            placement: "bottom",
                            html: true,
                            title: that._pathFormatter.format(subject),
                            trigger: "hover",
                            container: "#kloudspeaker-pluginpermissions-editor-user-related-permissions"
                        });
                    }
                }
            }, {
                id: "remove",
                title: "",
                type: "action",
                content: dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
            }],
            onRowAction: function(id, permission) {
                changes.remove(permission);
                relatedPermissions.remove(permission);
                $list.remove(permission);
                updateEffectivePermission();
            }
        });
        $list.add(relatedPermissions);
    };

    that.initItemPermissionEditor = function(changes, item, permissionName, permissions, userData) {
        var $list;

        var permissionValues = that._getPermissionValues(permissionName);
        var isGroup = function(id) {
            return (id != '0' && userData.usersById[id].is_group != "0");
        };
        var onAddOrUpdate = function(user, permissionVal) {
            var userVal = $list.findByKey(user.id);
            if (userVal) {
                changes.update(userVal, permissionVal);
                $list.update(userVal);
            } else {
                var removed = changes.findRemoved(user.id, item.id, permissionName);
                if (removed) {
                    // if previously deleted, move it to modified
                    removed.permission = permissionVal;
                    changes.update(removed);
                    $list.add(removed);
                } else {
                    // not modified or deleted => create new
                    var p = {
                        "user_id": user.id,
                        "subject": item.id,
                        "name": permissionName,
                        "value": permissionVal,
                        isnew: true
                    };
                    changes.addNew(p);
                    $list.add(p);
                }
            }
        };

        $list = controls.table("kloudspeaker-pluginpermissions-editor-permission-list", {
            key: "user_id",
            onRow: function($r, i) {
                if (isGroup(i.user_id)) $r.addClass("group");
            },
            columns: [{
                id: "user_id",
                title: loc.get('pluginPermissionsEditColUser'),
                renderer: function(i, v, $c) {
                    var name = (v != '0' ? userData.usersById[v].name : loc.get('pluginPermissionsEditDefaultPermission'));
                    $c.html(name).addClass("user");
                }
            }, {
                id: "value",
                title: loc.get('pluginPermissionsPermissionValue'),
                type: "select",
                options: permissionValues || ['0', '1'],
                formatter: function(item, k) {
                    return that._formatPermissionValue(item.name, k);
                },
                onChange: function(item, p) {
                    changes.update(item, p);
                },
                cellClass: "permission"
            }, {
                id: "remove",
                title: "",
                type: "action",
                content: dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
            }],
            onRowAction: function(id, permission) {
                changes.remove(permission);
                $list.remove(permission);
            }
        });

        $list.add(permissions);
        var $newUser = controls.select("kloudspeaker-pluginpermissions-editor-new-user", {
            none: loc.get('pluginPermissionsEditNoUser'),
            title: "name",
            onCreate: function($o, i) {
                if (isGroup(i.id)) $o.addClass("group");
            }
        });
        $newUser.add({
            name: loc.get('pluginPermissionsEditDefaultPermission'),
            id: 0,
            is_group: 0
        });
        $newUser.add(userData.users);
        $newUser.add(userData.groups);

        var $newPermission = controls.select("kloudspeaker-pluginpermissions-editor-new-permission", {
            values: permissionValues || ['0', '1'],
            none: loc.get('pluginPermissionsEditNoPermission'),
            formatter: function(p) {
                return that._formatPermissionValue(permissionName, p);
            }
        });

        var resetNew = function() {
            $newUser.select(false);
            $newPermission.select(false);
        };
        resetNew();

        $("#kloudspeaker-pluginpermissions-editor-new-add").unbind("click").click(function() {
            var selectedUser = $newUser.selected();
            if (!selectedUser) return;
            var selectedPermission = $newPermission.selected();
            if (!selectedPermission) return;

            onAddOrUpdate(selectedUser, selectedPermission);
            resetNew();
        });
    };

    that.renderItemContextDetails = function(el, item, $content) {
        dom.template("kloudspeaker-tmpl-permission-context").appendTo($content);
        ui.process($content, ["localize"]);

        that.loadPermissions(item, "filesystem_item_access", true).done(function(p) {
            var userData = that.processUserData(p.users);

            $("#kloudspeaker-pluginpermissions-context-content").removeClass("loading");

            var $list = controls.table("kloudspeaker-pluginpermissions-context-permission-list", {
                key: "user_id",
                columns: [{
                    id: "user_id",
                    title: loc.get('pluginPermissionsEditColUser'),
                    formatter: function(i, v) {
                        return (v != '0' ? userData.usersById[v].name : loc.get('pluginPermissionsEditDefaultPermission'));
                    }
                }, {
                    id: "value",
                    title: loc.get('pluginPermissionsPermissionValue'),
                    formatter: function(i, v) {
                        return that._formatPermissionValue(i.name, v);
                    }
                }]
            });
            $list.add(p.permissions);
            $("#kloudspeaker-pluginpermissions-context-edit").click(function() {
                el.close();
                that.editItemPermissions(item);
            });
        }).fail(function(e) {
            el.close();
        });
    };

    that.editGenericPermissions = function(user, changeCallback) {
        var permissionData = {
            "new": [],
            "modified": [],
            "removed": []
        };
        var $content = false;

        dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            title: user ? loc.get('pluginPermissionsEditDialogTitle', user.name) : loc.get('pluginPermissionsEditDefaultDialogTitle'),
            content: dom.template("kloudspeaker-tmpl-permission-generic-editor", {
                user: user
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
                if (permissionData["new"].length === 0 && permissionData.modified.length === 0 && permissionData.removed.length === 0)
                    return;

                $content.addClass("loading");
                service.put("permissions/list", permissionData).done(function() {
                    d.close();
                    if (changeCallback) changeCallback();
                }).fail(d.close);
            },
            "on-show": function(h, $d) {
                $content = $d.find("#kloudspeaker-pluginpermissions-editor-generic-content");
                h.center();
                var $list = false;

                service.get("permissions/user/" + (user ? user.id : '0') + "/generic/").done(function(r) {
                    var done = function(dp) {
                        $content.removeClass("loading");

                        var allTypeKeys = that._permissionTypes.keys.all;
                        var values = utils.mapByKey(r.permissions, "name", "value");
                        var defaultPermissions = dp ? utils.mapByKey(dp.permissions, "name", "value") : {};

                        var permissions = [];

                        $.each(allTypeKeys, function(i, t) {
                            var p = {
                                name: t,
                                value: values[t],
                                subject: '',
                                user_id: user ? user.id : '0'
                            };
                            if (!values[t]) p.isnew = true;
                            permissions.push(p);
                        });

                        var cols = [{
                            id: "name",
                            title: loc.get('pluginPermissionsPermissionName'),
                            formatter: function(item, name) {
                                if (that._permissionTypes.keys.filesystem.indexOf(name) >= 0) {
                                    if (!user) return that._formatPermissionName(item) + " (" + loc.get('permission_system_default') + ")";
                                    return that._formatPermissionName(item) + " (" + loc.get(user.is_group == '1' ? 'permission_group_default' : 'permission_user_default') + ")";
                                }
                                return that._formatPermissionName(item);
                            }
                        }, {
                            id: "value",
                            title: loc.get('pluginPermissionsPermissionValue'),
                            type: "select",
                            options: function(item) {
                                var itemValues = that._permissionTypes.values[item.name];
                                if (itemValues) return itemValues;
                                return ["0", "1"];
                            },
                            none: loc.get('permission_value_undefined'),
                            formatter: function(item, k) {
                                return that._formatPermissionValue(item.name, k);
                            },
                            onChange: function(item, p) {
                                item.value = p;

                                permissionData['new'].remove(item);
                                permissionData.modified.remove(item);
                                permissionData.removed.remove(item);

                                if (p != null) {
                                    if (item.isnew) permissionData['new'].push(item);
                                    else permissionData.modified.push(item);
                                } else {
                                    if (!item.isnew) permissionData.removed.push(item);
                                }
                            }
                        }];
                        if (user) {
                            cols.push({
                                id: "default",
                                title: loc.get('permission_system_default'),
                                formatter: function(p) {
                                    if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
                                    return that._formatPermissionValue(p.name, defaultPermissions[p.name]);
                                }
                            });
                        }

                        $list = controls.table("kloudspeaker-pluginpermissions-editor-generic-permission-list", {
                            key: "name",
                            columns: cols
                        });
                        $list.add(permissions);
                    };
                    if (user) service.get("permissions/user/0/generic/").done(done);
                    else done();
                }).fail(h.close);
            }
        });
    };

    that.getUserConfigPermissionsListView = function($c, title, u) {
        var permissions = false;
        var defaultPermissions = false;
        var permissionsView = false;

        var refresh = function() {
            $c.addClass("loading");
            service.get("permissions/user/" + u.id + "/generic/").done(function(l) {
                service.get("permissions/user/0/generic/").done(function(d) {
                    $c.removeClass("loading");

                    defaultPermissions = utils.mapByKey(d.permissions, "name", "value");

                    var values = utils.mapByKey(l.permissions, "name");
                    permissions = [];

                    $.each(that._permissionTypes.keys.all, function(i, t) {
                        var op = values[t];
                        var p = op ? op : {
                            name: t,
                            value: undefined,
                            subject: '',
                            user_id: u.id
                        };
                        permissions.push(p);
                    });

                    permissionsView.table.set(permissions);
                });
            });
        };

        permissionsView = new kloudspeaker.view.ConfigListView($c, {
            title: title,
            actions: [{
                id: "action-edit",
                content: '<i class="fa fa-user"></i>',
                tooltip: loc.get(u.is_group == '1' ? 'pluginPermissionsEditGroupPermissionsAction' : 'pluginPermissionsEditUserPermissionsAction'),
                callback: function() {
                    that.editGenericPermissions(u, refresh);
                }
            }, {
                id: "action-edit-defaults",
                content: '<i class="fa fa-globe"></i>',
                tooltip: loc.get('pluginPermissionsEditDefaultPermissionsAction'),
                callback: function() {
                    that.editGenericPermissions(false, refresh);
                }
            }],
            table: {
                id: "config-admin-userpermissions",
                key: "id",
                narrow: true,
                columns: [{
                    id: "name",
                    title: loc.get('pluginPermissionsPermissionName'),
                    formatter: function(p, v) {
                        if (v in that._permissionTypes.keys.filesystem)
                            return loc.get('permission_default_' + v);
                        return loc.get('permission_' + v);
                    }
                }, {
                    id: "value",
                    title: loc.get('pluginPermissionsPermissionValue'),
                    formatter: function(p, v) {
                        if (v === undefined) return "";
                        return that._formatPermissionValue(p.name, v);
                    }
                }, {
                    id: "default",
                    title: loc.get('permission_system_default'),
                    formatter: function(p) {
                        if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
                        return that._formatPermissionValue(p.name, defaultPermissions[p.name]);
                    }
                }]
            }
        });

        refresh();

        return {
            refresh: refresh,
            view: permissionsView
        };
    };

    views.registerConfigView({
        id: 'permissions',
        title: 'i18n:pluginPermissionsConfigViewNavTitle',
        model: 'kloudspeaker/plugins/permissions/config',
        view: '#kloudspeaker-tmpl-empty',
        admin: true
    });

    plugins.register({
        id: "plugin-permissions",
        initialize: that.initialize,
        itemContextHandler: function(item, ctx, data) {
            var s = session.get();
            if (!s.user || !s.user.admin) return false;

            return {
                details: {
                    "title-key": "pluginPermissionsContextTitle",
                    "on-render": function(el, $content) {
                        that.renderItemContextDetails(el, item, $content);
                    }
                },
                actions: [{
                    id: 'pluginPermissions',
                    'title-key': 'pluginPermissionsAction',
                    callback: function() {
                        that.editItemPermissions(item);
                    }
                }]
            };
        },
        /*configViewHandler: {
            views: function() {
                return [{
                    viewId: "permissions",
                    admin: true,
                    title: loc.get("pluginPermissionsConfigViewNavTitle"),
                    onActivate: that.onActivateConfigView
                }];
            }
        },*/
        editItemPermissions: that.editItemPermissions,
        editGenericPermissions: that.editGenericPermissions,
        getUserConfigPermissionsListView: that.getUserConfigPermissionsListView,
        _processUserData: that.processUserData,
        _permissionTypes: function() {
            return that._permissionTypes;
        },
        _formatPermissionName: that._formatPermissionName,
        _formatPermissionValue: that._formatPermissionValue,
        //_getPermissionValues: that._getPermissionValues
    });
});
