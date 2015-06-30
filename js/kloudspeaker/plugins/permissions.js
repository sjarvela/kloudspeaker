define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/plugins'], function(app, settings, plugins) {
    //TODO remove reference to global "kloudspeaker"

    var that = {};
    that._permissionTypes = false;

    that.initialize = function() {
        if (that._init) return;

        kloudspeaker.events.addEventHandler(function(e) {
            if (!that._permissionTypes && kloudspeaker.session.user) that._permissionTypes = kloudspeaker.session.data.permission_types
        }, "session/start");
        that._pathFormatter = new kloudspeaker.ui.formatters.FilesystemItemPath();
        that._init = true;
    };

    that._formatPermissionName = function(p) {
        var name = kloudspeaker.ui.texts.get('permission_' + p.name);
        if (p.subject == null && that._permissionTypes.filesystem[p.name])
            return kloudspeaker.ui.texts.get('permission_default', name);
        return name;
    };

    that._formatPermissionValue = function(name, val) {
        var values = that._getPermissionValues(name);
        if (values)
            return kloudspeaker.ui.texts.get('permission_' + name + '_value_' + val);
        return kloudspeaker.ui.texts.get('permission_value_' + val);
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

        kloudspeaker.ui.dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            title: kloudspeaker.ui.texts.get('pluginPermissionsEditDialogTitle', item.name),
            content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor", {
                item: item
            }),
            buttons: [{
                id: "yes",
                "title": kloudspeaker.ui.texts.get('dialogSave')
            }, {
                id: "no",
                "title": kloudspeaker.ui.texts.get('dialogCancel')
            }],
            "on-button": function(btn, d) {
                if (btn.id == 'no') {
                    d.close();
                    return;
                }
                if (modificationData["new"].length === 0 && modificationData.modified.length === 0 && modificationData.removed.length === 0)
                    return;

                kloudspeaker.service.put("permissions/list", modificationData).done(d.close).fail(d.close);
            },
            "on-show": function(h, $d) {
                $content = $d.find("#kloudspeaker-pluginpermissions-editor-content");
                var $subContents = $content.find(".kloudspeaker-pluginpermissions-editor-subcontent").hide();
                var $activeSubContent = false;
                var activeTab = 0;
                var selectedPermission = false;

                h.center();

                kloudspeaker.service.get("configuration/users?g=1").done(function(l) {
                    var users = that.processUserData(l);
                    var names = that._permissionTypes.keys.filesystem;
                    var init = 'filesystem_item_access';
                    var onPermissionsModified = function() {
                        var info = (modificationData["new"].length > 0 || modificationData.modified.length > 0 || modificationData.removed.length > 0) ? "<i class='icon-exclamation-sign '/>&nbsp;" + kloudspeaker.ui.texts.get('pluginPermissionsEditDialogUnsaved') : false;
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

                    kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-permission-name", {
                        onChange: onChangePermission,
                        formatter: function(name) {
                            return kloudspeaker.ui.texts.get('permission_' + name);
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
                                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(kloudspeaker.ui.texts.get("pluginPermissionsUserPermissionsAdmin"));
                                return;
                            }
                            $sc.addClass("loading");

                            kloudspeaker.service.get("permissions/user/" + sel.id + "?e=1&subject=" + item.id + "&name=" + selectedPermission).done(function(p) {
                                $sc.removeClass("loading");

                                var permissions = p.permissions.slice(0);
                                removeAndUpdate(permissions);
                                permissions = addNewUserAndGroupPermissions(permissions, sel, selectedPermission);
                                that.initUserPermissionInspector(changes, sel, item, selectedPermission, permissions, p.items, users);
                            }).fail(h.close);
                        };

                        kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-permission-user", {
                            onChange: onChangeUser,
                            none: kloudspeaker.ui.texts.get("pluginPermissionsEditNoUser"),
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
        return kloudspeaker.service.get("permissions/list?subject=" + item.id + (name ? "&name=" + name : "") + (users ? "&u=1" : ""));
    };

    that.initUserPermissionInspector = function(changes, user, item, permissionName, relatedPermissions, items, userData) {
        var updateEffectivePermission = function() {
            var ep = false;
            if (relatedPermissions.length > 0) ep = relatedPermissions[0].value;
            if (ep) {
                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(kloudspeaker.ui.texts.get('pluginPermissionsEffectiveUserPermission', that._formatPermissionValue(permissionName, ep)));
                $("#kloudspeaker-pluginpermissions-editor-user-related-permissions").show();
            } else {
                var values = that._getPermissionValues(permissionName);
                $("#kloudspeaker-pluginpermissions-editor-user-permissions-description").html(kloudspeaker.ui.texts.get('pluginPermissionsNoEffectiveUserPermission', that._formatPermissionValue(permissionName, values ? values[0] : '0')));
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

        var $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-editor-user-permission-list", {
            key: "user_id",
            onRow: function($r, i) {
                if (isGroup(i.user_id)) $r.addClass("group");
            },
            columns: [{
                id: "user_id",
                title: kloudspeaker.ui.texts.get('pluginPermissionsEditColUser'),
                renderer: function(i, v, $c) {
                    if (v == '0' && i.subject === '') return;
                    if (v == '0') {
                        $c.html("<em>" + kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission') + "</em>");
                        return;
                    }
                    $c.html(userData.usersById[v].name).addClass("user");
                }
            }, {
                id: "value",
                title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                formatter: function(item, k) {
                    return that._formatPermissionValue(permissionName, k);
                }
            }, {
                id: "subject",
                title: kloudspeaker.ui.texts.get('pluginPermissionsEditColSource'),
                renderer: function(i, s, $c) {
                    var subject = items[s];
                    if (!subject) {
                        var n = kloudspeaker.ui.texts.get("permission_system_default");
                        if (i.user_id != '0') {
                            var user = userData.usersById[i.user_id];
                            n = kloudspeaker.ui.texts.get((user.is_group == '1' ? "permission_group_default" : "permission_user_default"));
                        }
                        $c.html("<em>" + n + "</em>");
                    } else {
                        if (subject.id == item.id) {
                            $c.html('<i class="icon-file-alt"/>&nbsp;' + kloudspeaker.ui.texts.get('pluginPermissionsEditColItemCurrent'));
                        } else {
                            var level = Math.max(item.path.count("/"), item.path.count("\\")) - Math.max(subject.path.count("/"), subject.path.count("\\")) + 1;
                            $c.html('<i class="icon-file-alt"/>&nbsp;' + kloudspeaker.ui.texts.get('pluginPermissionsEditColItemParent', level));
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
                content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
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

        $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-editor-permission-list", {
            key: "user_id",
            onRow: function($r, i) {
                if (isGroup(i.user_id)) $r.addClass("group");
            },
            columns: [{
                id: "user_id",
                title: kloudspeaker.ui.texts.get('pluginPermissionsEditColUser'),
                renderer: function(i, v, $c) {
                    var name = (v != '0' ? userData.usersById[v].name : kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission'));
                    $c.html(name).addClass("user");
                }
            }, {
                id: "value",
                title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
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
                content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
            }],
            onRowAction: function(id, permission) {
                changes.remove(permission);
                $list.remove(permission);
            }
        });

        $list.add(permissions);
        var $newUser = kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-new-user", {
            none: kloudspeaker.ui.texts.get('pluginPermissionsEditNoUser'),
            title: "name",
            onCreate: function($o, i) {
                if (isGroup(i.id)) $o.addClass("group");
            }
        });
        $newUser.add({
            name: kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission'),
            id: 0,
            is_group: 0
        });
        $newUser.add(userData.users);
        $newUser.add(userData.groups);

        var $newPermission = kloudspeaker.ui.controls.select("kloudspeaker-pluginpermissions-editor-new-permission", {
            values: permissionValues || ['0', '1'],
            none: kloudspeaker.ui.texts.get('pluginPermissionsEditNoPermission'),
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
        kloudspeaker.dom.template("kloudspeaker-tmpl-permission-context").appendTo($content);
        kloudspeaker.ui.process($content, ["localize"]);

        that.loadPermissions(item, "filesystem_item_access", true).done(function(p) {
            var userData = that.processUserData(p.users);

            $("#kloudspeaker-pluginpermissions-context-content").removeClass("loading");

            var $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-context-permission-list", {
                key: "user_id",
                columns: [{
                    id: "user_id",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsEditColUser'),
                    formatter: function(i, v) {
                        return (v != '0' ? userData.usersById[v].name : kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermission'));
                    }
                }, {
                    id: "value",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
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

    that.onActivateConfigView = function($c, cv) {
        kloudspeaker.service.get("configuration/users?g=1").done(function(l) {
            var users = that.processUserData(l);

            var allTypeKeys = that._permissionTypes.keys.all;
            var $optionName, $optionUser, $optionSubject;
            var queryItems = [];

            var getQueryParams = function(i) {
                var name = $optionName.get();
                var user = $optionUser.get();
                var subject = $optionSubject.get();

                var params = {};
                if (name) params.name = name;
                if (user) params.user_id = user.id;
                if (subject) {
                    params.subject_type = subject;

                    if (subject == 'filesystem_item' || subject == 'filesystem_child') {
                        if (selectedSubjectItem)
                            params.subject_value = selectedSubjectItem.id;
                        else
                            params.subject_type = null;
                    }
                }

                return params;
            };

            var refresh = function() {
                cv.showLoading(true);
                listView.table.refresh().done(function() {
                    cv.showLoading(false);
                });
            };

            var removePermissions = function(list) {
                return kloudspeaker.service.del("permissions/list/", {
                    list: list
                });
            }

            var listView = new kloudspeaker.view.ConfigListView($c, {
                actions: [{
                    id: "action-item-permissions",
                    content: '<i class="icon-file"></i>',
                    tooltip: kloudspeaker.ui.texts.get('configAdminPermissionsEditItemPermissionsTooltip'),
                    callback: function(sel) {
                        kloudspeaker.ui.dialogs.itemSelector({
                            title: kloudspeaker.ui.texts.get('configAdminPermissionsEditItemPermissionsTitle'),
                            message: kloudspeaker.ui.texts.get('configAdminPermissionsEditItemPermissionsMessage'),
                            actionTitle: kloudspeaker.ui.texts.get('ok'),
                            allRoots: true,
                            handler: {
                                onSelect: function(i) {
                                    that.editItemPermissions(i);
                                },
                                canSelect: function(f) {
                                    return true;
                                }
                            }
                        });
                    },
                }, {
                    id: "action-remove",
                    content: '<i class="icon-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        kloudspeaker.ui.dialogs.confirmation({
                            title: kloudspeaker.ui.texts.get("configAdminPermissionsRemoveConfirmationTitle"),
                            message: kloudspeaker.ui.texts.get("configAdminPermissionsRemoveConfirmationMessage", [sel.length]),
                            callback: function() {
                                removePermissions(sel).done(refresh);
                            }
                        });
                    }
                }, {
                    id: "action-edit-generic",
                    content: '<i class="icon-globe"></i>',
                    tooltip: kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermissionsAction'),
                    callback: function() {
                        that.editGenericPermissions();
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="icon-refresh"></i>',
                    callback: refresh
                }],
                table: {
                    id: "config-permissions-list",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    remote: {
                        path: "permissions/query",
                        paging: {
                            max: 50
                        },
                        queryParams: getQueryParams,
                        onData: function(r) {
                            queryItems = r.items;
                        },
                        onLoad: function(pr) {
                            $c.addClass("loading");
                            pr.done(function(r) {
                                $c.removeClass("loading");
                            });
                        }
                    },
                    defaultSort: {
                        id: "time",
                        asc: false
                    },
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "name",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionName'),
                        sortable: true,
                        formatter: function(item, name) {
                            return that._formatPermissionName(item);
                        }
                    }, {
                        id: "value",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                        sortable: true,
                        formatter: function(item, k) {
                            return that._formatPermissionValue(item.name, k);
                        }
                    }, {
                        id: "user_id",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionUser'),
                        sortable: true,
                        formatter: function(item, u) {
                            if (!u || u == "0")
                                return "";
                            return users.usersById[u].name;
                        }
                    }, {
                        id: "subject",
                        title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionSubject'),
                        formatter: function(item, s) {
                            if (!s) return "";
                            if ((that._permissionTypes.keys.filesystem.indexOf(item.name) >= 0) && queryItems[s]) {
                                var itm = queryItems[s];
                                if (itm) return that._pathFormatter.format(itm);
                            }
                            return s;
                        }
                    }, {
                        id: "remove",
                        title: "",
                        type: "action",
                        content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
                    }],
                    onRowAction: function(id, permission) {
                        removePermissions([permission]).done(refresh);
                    }
                }
            });
            var $options = $c.find(".kloudspeaker-configlistview-options");
            kloudspeaker.dom.template("kloudspeaker-tmpl-permission-admin-options").appendTo($options);
            kloudspeaker.ui.process($options, ["localize"]);

            $("#permissions-subject-any").attr('checked', true);

            $optionName = kloudspeaker.ui.controls.select("permissions-name", {
                values: allTypeKeys,
                formatter: function(t) {
                    return kloudspeaker.ui.texts.get('permission_' + t);
                },
                none: kloudspeaker.ui.texts.get('pluginPermissionsAdminAny')
            });

            $optionUser = kloudspeaker.ui.controls.select("permissions-user", {
                values: users.all,
                title: "name",
                none: kloudspeaker.ui.texts.get('pluginPermissionsAdminAny')
            });

            var $subjectItemSelector = $("#permissions-subject-filesystem-item-selector");
            var $subjectItemSelectorValue = $("#permissions-subject-filesystem-item-value");
            var selectedSubjectItem = false;
            var onSelectItem = function(i) {
                selectedSubjectItem = i;
                $subjectItemSelectorValue.val(that._pathFormatter.format(i));
            };
            $("#permissions-subject-filesystem-item-select").click(function(e) {
                if ($optionSubject.get() == 'filesystem_item') {
                    kloudspeaker.ui.dialogs.itemSelector({
                        title: kloudspeaker.ui.texts.get('pluginPermissionsSelectItemTitle'),
                        message: kloudspeaker.ui.texts.get('pluginPermissionsSelectItemMsg'),
                        actionTitle: kloudspeaker.ui.texts.get('ok'),
                        handler: {
                            onSelect: onSelectItem,
                            canSelect: function(f) {
                                return true;
                            }
                        }
                    });
                } else {
                    kloudspeaker.ui.dialogs.folderSelector({
                        title: kloudspeaker.ui.texts.get('pluginPermissionsSelectFolderTitle'),
                        message: kloudspeaker.ui.texts.get('pluginPermissionsSelectFolderMsg'),
                        actionTitle: kloudspeaker.ui.texts.get('ok'),
                        handler: {
                            onSelect: onSelectItem,
                            canSelect: function(f) {
                                return true;
                            }
                        }
                    });
                }
                return false;
            });
            $optionSubject = kloudspeaker.ui.controls.select("permissions-subject", {
                values: ['none', 'filesystem_item', 'filesystem_child'],
                formatter: function(s) {
                    return kloudspeaker.ui.texts.get('pluginPermissionsAdminOptionSubject_' + s);
                },
                none: kloudspeaker.ui.texts.get('pluginPermissionsAdminAny'),
                onChange: function(s) {
                    if (s == 'filesystem_item' || s == 'filesystem_child') {
                        selectedSubjectItem = false;
                        $subjectItemSelectorValue.val("");
                        $subjectItemSelector.show();
                    } else {
                        $subjectItemSelector.hide();
                    }
                }
            });
            refresh();
        });
    };

    that.editGenericPermissions = function(user, changeCallback) {
        var permissionData = {
            "new": [],
            "modified": [],
            "removed": []
        };
        var $content = false;

        kloudspeaker.ui.dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            title: user ? kloudspeaker.ui.texts.get('pluginPermissionsEditDialogTitle', user.name) : kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultDialogTitle'),
            content: kloudspeaker.dom.template("kloudspeaker-tmpl-permission-generic-editor", {
                user: user
            }),
            buttons: [{
                id: "yes",
                "title": kloudspeaker.ui.texts.get('dialogSave')
            }, {
                id: "no",
                "title": kloudspeaker.ui.texts.get('dialogCancel')
            }],
            "on-button": function(btn, d) {
                if (btn.id == 'no') {
                    d.close();
                    return;
                }
                if (permissionData["new"].length === 0 && permissionData.modified.length === 0 && permissionData.removed.length === 0)
                    return;

                $content.addClass("loading");
                kloudspeaker.service.put("permissions/list", permissionData).done(function() {
                    d.close();
                    if (changeCallback) changeCallback();
                }).fail(d.close);
            },
            "on-show": function(h, $d) {
                $content = $d.find("#kloudspeaker-pluginpermissions-editor-generic-content");
                h.center();
                var $list = false;

                kloudspeaker.service.get("permissions/user/" + (user ? user.id : '0') + "/generic/").done(function(r) {
                    var done = function(dp) {
                        $content.removeClass("loading");

                        var allTypeKeys = that._permissionTypes.keys.all;
                        var values = kloudspeaker.helpers.mapByKey(r.permissions, "name", "value");
                        var defaultPermissions = dp ? kloudspeaker.helpers.mapByKey(dp.permissions, "name", "value") : {};

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
                            title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionName'),
                            formatter: function(item, name) {
                                if (that._permissionTypes.keys.filesystem.indexOf(name) >= 0) {
                                    if (!user) return that._formatPermissionName(item) + " (" + kloudspeaker.ui.texts.get('permission_system_default') + ")";
                                    return that._formatPermissionName(item) + " (" + kloudspeaker.ui.texts.get(user.is_group == '1' ? 'permission_group_default' : 'permission_user_default') + ")";
                                }
                                return that._formatPermissionName(item);
                            }
                        }, {
                            id: "value",
                            title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                            type: "select",
                            options: function(item) {
                                var itemValues = that._permissionTypes.values[item.name];
                                if (itemValues) return itemValues;
                                return ["0", "1"];
                            },
                            none: kloudspeaker.ui.texts.get('permission_value_undefined'),
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
                                title: kloudspeaker.ui.texts.get('permission_system_default'),
                                formatter: function(p) {
                                    if (!(p.name in defaultPermissions) || defaultPermissions[p.name] === undefined) return "";
                                    return that._formatPermissionValue(p.name, defaultPermissions[p.name]);
                                }
                            });
                        }

                        $list = kloudspeaker.ui.controls.table("kloudspeaker-pluginpermissions-editor-generic-permission-list", {
                            key: "name",
                            columns: cols
                        });
                        $list.add(permissions);
                    };
                    if (user) kloudspeaker.service.get("permissions/user/0/generic/").done(done);
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
            kloudspeaker.service.get("permissions/user/" + u.id + "/generic/").done(function(l) {
                kloudspeaker.service.get("permissions/user/0/generic/").done(function(d) {
                    $c.removeClass("loading");

                    defaultPermissions = kloudspeaker.helpers.mapByKey(d.permissions, "name", "value");

                    var values = kloudspeaker.helpers.mapByKey(l.permissions, "name");
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
                content: '<i class="icon-user"></i>',
                tooltip: kloudspeaker.ui.texts.get(u.is_group == '1' ? 'pluginPermissionsEditGroupPermissionsAction' : 'pluginPermissionsEditUserPermissionsAction'),
                callback: function() {
                    that.editGenericPermissions(u, refresh);
                }
            }, {
                id: "action-edit-defaults",
                content: '<i class="icon-globe"></i>',
                tooltip: kloudspeaker.ui.texts.get('pluginPermissionsEditDefaultPermissionsAction'),
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
                    title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionName'),
                    formatter: function(p, v) {
                        if (v in that._permissionTypes.keys.filesystem)
                            return kloudspeaker.ui.texts.get('permission_default_' + v);
                        return kloudspeaker.ui.texts.get('permission_' + v);
                    }
                }, {
                    id: "value",
                    title: kloudspeaker.ui.texts.get('pluginPermissionsPermissionValue'),
                    formatter: function(p, v) {
                        if (v === undefined) return "";
                        return that._formatPermissionValue(p.name, v);
                    }
                }, {
                    id: "default",
                    title: kloudspeaker.ui.texts.get('permission_system_default'),
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

    plugins.register({
        id: "plugin-permissions",
        initialize: that.initialize,
        itemContextHandler: function(item, ctx, data) {
            if (!kloudspeaker.session.user.admin) return false;

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
        configViewHandler: {
            views: function() {
                return [{
                    viewId: "permissions",
                    admin: true,
                    title: kloudspeaker.ui.texts.get("pluginPermissionsConfigViewNavTitle"),
                    onActivate: that.onActivateConfigView
                }];
            }
        },
        editGenericPermissions: that.editGenericPermissions,
        getUserConfigPermissionsListView: that.getUserConfigPermissionsListView
    });
});