define(['kloudspeaker/plugins', 'kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/utils', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/formatters', 'kloudspeaker/dom', 'kloudspeaker/ui', 'kloudspeaker/ui/views', 'kloudspeaker/localization', 'kloudspeaker/ui/config/listview'], function(plugins, session, service, utils, controls, dialogs, formatters, dom, ui, views, loc, ConfigListView) {
    return function(ctx) {
        var that = this;
        var pl = plugins.get('plugin-permissions');

        that.init = function($c) {
            that._pathFormatter = new formatters.FilesystemItemPath();

            service.get("configuration/users?g=1").done(function(l) {
                var users = pl._processUserData(l);

                var allTypeKeys = pl._permissionTypes().keys.all;
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
                    that._cv.showLoading(true);
                    listView.table.refresh().done(function() {
                        that._cv.showLoading(false);
                    });
                };

                var removePermissions = function(list) {
                    return service.del("permissions/list/", {
                        list: list
                    });
                }

                var listView = new ConfigListView($c, {
                    actions: [{
                        id: "action-item-permissions",
                        content: '<i class="fa fa-file"></i>',
                        tooltip: loc.get('configAdminPermissionsEditItemPermissionsTooltip'),
                        callback: function(sel) {
                            dialogs.itemSelector({
                                title: loc.get('configAdminPermissionsEditItemPermissionsTitle'),
                                message: loc.get('configAdminPermissionsEditItemPermissionsMessage'),
                                actionTitle: loc.get('ok'),
                                allRoots: true,
                                handler: {
                                    onSelect: function(i) {
                                        pl.editItemPermissions(i);
                                    },
                                    canSelect: function(f) {
                                        return true;
                                    }
                                }
                            });
                        },
                    }, {
                        id: "action-remove",
                        content: '<i class="fa fa-trash"></i>',
                        cls: "btn-danger",
                        depends: "table-selection",
                        callback: function(sel) {
                            dialogs.confirmation({
                                title: loc.get("configAdminPermissionsRemoveConfirmationTitle"),
                                message: loc.get("configAdminPermissionsRemoveConfirmationMessage", [sel.length]),
                                callback: function() {
                                    removePermissions(sel).done(refresh);
                                }
                            });
                        }
                    }, {
                        id: "action-edit-generic",
                        content: '<i class="fa fa-globe"></i>',
                        tooltip: loc.get('pluginPermissionsEditDefaultPermissionsAction'),
                        callback: function() {
                            pl.editGenericPermissions();
                        }
                    }, {
                        id: "action-refresh",
                        content: '<i class="fa fa-refresh"></i>',
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
                            title: loc.get('pluginPermissionsPermissionName'),
                            sortable: true,
                            formatter: function(item, name) {
                                return pl._formatPermissionName(item);
                            }
                        }, {
                            id: "value",
                            title: loc.get('pluginPermissionsPermissionValue'),
                            sortable: true,
                            formatter: function(item, k) {
                                return pl._formatPermissionValue(item.name, k);
                            }
                        }, {
                            id: "user_id",
                            title: loc.get('pluginPermissionsPermissionUser'),
                            sortable: true,
                            formatter: function(item, u) {
                                if (!u || u == "0")
                                    return "";
                                return users.usersById[u].name;
                            }
                        }, {
                            id: "subject",
                            title: loc.get('pluginPermissionsPermissionSubject'),
                            formatter: function(item, s) {
                                if (!s) return "";
                                if ((pl._permissionTypes().keys.filesystem.indexOf(item.name) >= 0) && queryItems[s]) {
                                    var itm = queryItems[s];
                                    if (itm) return that._pathFormatter.format(itm);
                                }
                                return s;
                            }
                        }, {
                            id: "remove",
                            title: "",
                            type: "action",
                            content: dom.template("kloudspeaker-tmpl-permission-editor-listremove").html()
                        }],
                        onRowAction: function(id, permission) {
                            removePermissions([permission]).done(refresh);
                        }
                    }
                });
                var $options = $c.find(".kloudspeaker-configlistview-options");
                dom.template("kloudspeaker-tmpl-permission-admin-options").appendTo($options);
                ui.process($options, ["localize"]);

                $("#permissions-subject-any").attr('checked', true);

                $optionName = controls.select("permissions-name", {
                    values: allTypeKeys,
                    formatter: function(t) {
                        return loc.get('permission_' + t);
                    },
                    none: loc.get('pluginPermissionsAdminAny')
                });

                $optionUser = controls.select("permissions-user", {
                    values: users.all,
                    title: "name",
                    none: loc.get('pluginPermissionsAdminAny')
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
                        dialogs.itemSelector({
                            title: loc.get('pluginPermissionsSelectItemTitle'),
                            message: loc.get('pluginPermissionsSelectItemMsg'),
                            actionTitle: loc.get('ok'),
                            handler: {
                                onSelect: onSelectItem,
                                canSelect: function(f) {
                                    return true;
                                }
                            }
                        });
                    } else {
                        dialogs.folderSelector({
                            title: loc.get('pluginPermissionsSelectFolderTitle'),
                            message: loc.get('pluginPermissionsSelectFolderMsg'),
                            actionTitle: loc.get('ok'),
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
                $optionSubject = controls.select("permissions-subject", {
                    values: ['none', 'filesystem_item', 'filesystem_child'],
                    formatter: function(s) {
                        return loc.get('pluginPermissionsAdminOptionSubject_' + s);
                    },
                    none: loc.get('pluginPermissionsAdminAny'),
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

        return {
            attached: function($t, $c) {
                that._cv = views.getActiveConfigView();
                that.init($c);
            }
        };
    };
});
