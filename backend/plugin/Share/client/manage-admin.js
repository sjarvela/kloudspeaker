define(['kloudspeaker/share', 'kloudspeaker/share/repository', 'kloudspeaker/core/user/repository', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/dialogs'], function(share, repository, userRepository, session, fs, utils, texts, formatters, dialogs) {
    return function() {
        var onSelectItem = function() {
            var type = model.options.itemType();
            if (!type) return;
            if (type == 'filesystem_item') {
                dialogs.itemSelector({
                    title: texts.get('pluginShareSelectItemTitle'),
                    message: texts.get('pluginShareSelectItemMsg'),
                    actionTitle: texts.get('ok'),
                    handler: {
                        onSelect: model.options.item,
                        canSelect: function(f) {
                            return true;
                        }
                    }
                });
            } else {
                dialogs.folderSelector({
                    title: texts.get('pluginShareSelectFolderTitle'),
                    message: texts.get('pluginShareSelectFolderMsg'),
                    actionTitle: texts.get('ok'),
                    handler: {
                        onSelect: model.options.item,
                        canSelect: function(f) {
                            return true;
                        }
                    }
                });
            }
        };

        var model = {
            items: ko.observableArray([]),
            options: {
                user: ko.observable(null),
                userNoneTitle: texts.get('pluginShareAdminAny'),
                users: ko.observableArray([]),
                userOptionTitle: function(u) {
                    return u.name;
                },

                itemType: ko.observable(null),
                itemTypes: ['none', 'filesystem_item', 'filesystem_child'],
                itemTypeNoneTitle: texts.get('pluginShareAdminAny'),
                itemTypeOptionTitle: function(t) {
                    return texts.get('pluginShareAdminOptionItem_' + t);
                },

                item: ko.observable(null),
                pathFormatter: new formatters.FilesystemItemPath(),
                onSelectItem: onSelectItem
            }
        };

        model.options.itemType.subscribe(function(v) {
            model.options.item(null);
        });

        var timestampFormatter = new formatters.Timestamp(texts.get('shortDateTimeFormat'));
        var listRefresh = utils.createNotifier();

        return {
            customTitle: true,
            model: model,
            tools: [{
                id: "action-remove",
                icon: 'trash',
                cls: "btn-danger",
                depends: "selection",
                action: function(sel) {
                    dialogs.confirmation({
                        title: texts.get("pluginShareConfigRemoveShareTitle"),
                        message: texts.get("pluginShareConfigRemoveShareMessage", [sel.length]),
                        callback: function() {
                            repository.deleteShares(utils.extractValue(sel, "id")).done(listRefresh.trigger);
                        }
                    });
                }
            }, {
                id: "action-activate",
                icon: 'check',
                depends: "selection",
                tooltip: texts.get('pluginShareConfigViewShareActivate'),
                action: function(sel) {
                    repository.activateShares(utils.extractValue(sel, "id")).done(listRefresh.trigger);
                }
            }, {
                id: "action-deactivate",
                icon: 'check-empty',
                depends: "selection",
                tooltip: texts.get('pluginShareConfigViewShareDeactivate'),
                action: function(sel) {
                    repository.deactivateShares(utils.extractValue(sel, "id")).done(listRefresh.trigger);
                }
            }, {
                id: "action-refresh",
                icon: 'refresh',
                action: listRefresh.trigger
            }],
            cols: [{
                type: 'select',
            }, {
                type: "icon",
                name: function(s) {
                    if (s.invalid) return "exclamation";

                    var item = model.items[s.item_id];
                    if (item.customType) return ""; //TODO type icon
                    if (!item.is_file) return 'folder-close';
                    return 'file';
                }
            }, {
                id: "restriction",
                type: 'icon',
                tooltip: function(s) {
                    if (s.restriction == 'private') return texts.get('shareDialogShareAccessLoggedInTitle');
                    else if (s.restriction == 'pw') return texts.get('shareDialogShareAccessPasswordTitle').replace(':', '');
                    else return texts.get('shareDialogShareAccessNoRestrictionTitle');
                },
                name: function(s) {
                    if (s.restriction == 'private') return 'user';
                    else if (s.restriction == 'pw') return 'lock';
                    else return 'globe';
                }
            }, {
                id: 'name',
                titleKey: 'pluginShareConfigViewShareNameTitle'
            }, {
                id: 'item_name',
                titleKey: 'pluginShareConfigViewItemNameTitle',
                content: function(s) {
                    if (s.invalid) return ""; //TODO
                    return model.items[s.item_id].name;
                }
            }, {
                id: 'path',
                titleKey: 'pluginShareConfigViewPathTitle',
                content: function(s) {
                    if (s.invalid) return ""; //TODO

                    var item = model.items[s.item_id];
                    if (item.customType || !item.path) return "";

                    var p = (fs.rootsById[item.root_id] ? fs.rootsById[item.root_id].name : item.root_id) + ":";
                    var path = item.path.substring(0, item.path.length - (item.name.length + (item.is_file ? 0 : 1)));
                    return p + "/" + path;
                }
            }, {
                id: "expiration",
                titleKey: 'pluginShareConfigViewExpirationTitle',
                content: function(s) {
                    if (!s.expiration) return "";
                    return timestampFormatter.format(s.expiration);
                }
            }, {
                id: "active",
                type: 'icon',
                title: texts.get('pluginShareConfigViewActiveTitle'),
                name: function(s) {
                    if (s.active == "1") return 'check';
                    else return 'check-empty';
                }
            }, {
                id: 'edit',
                type: 'action',
                icon: 'edit',
                title: '',
                visible: function(s) {
                    return !s.invalid;
                },
                action: function(s) {
                    share.editShare(s);
                }
            }, {
                id: 'trash',
                type: 'action',
                icon: 'trash',
                title: '',
                action: function(s) {
                    repository.removeShare(s).done(refresh);
                }
            }],
            remote: {
                handler: repository.getQueryHandler(function() {
                    var params = {};
                    if (model.options.user()) params.user_id = model.options.user().id;
                    if (model.options.itemType()) {
                        params.item = model.options.itemType();
                        params.item_id = null;

                        var item = model.options.item();
                        if (item && (params.item == 'filesystem_item' || params.item == 'filesystem_child'))
                            params.item_id = item.id;
                    }
                    return params;
                }, function(l) {
                    model.shares = l.data;
                    model.invalid = l.invalid;
                    model.nonfs = l.nonfs;
                    model.items = l.items;

                    _.each(l.nonfs, function(itm) {
                        model.items[itm.id] = {
                            id: itm.id,
                            name: itm.name,
                            customType: itm.type
                        };
                    });
                    return l;
                }),
                refresh: listRefresh
            },
            activate: function(o) {
                userRepository.getAllUsers().done(function(u) {
                    model.options.users(u);
                })
            }
        };
    };
});
