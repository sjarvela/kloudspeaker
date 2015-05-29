define(['kloudspeaker/share', 'kloudspeaker/share/repository', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/utils'], function(share, repository, session, fs, utils) {
    return function() {
        var model = {
            items: ko.observableArray([]),
        };
        var isValidItem = function(i) {
            if (!model.invalid || model.invalid.length === 0) return true;
            return (model.invalid.indexOf(i.id) < 0);
        };

        var refresh = function() {
            var s = session.get();

            repository.getUserShares().done(function(result) {
                model.shares = result.shares[s.user.id];
                model.invalid = result.invalid;

                var items = [];
                _.each(utils.getKeys(result.items), function(k) {
                    items.push(result.items[k]);
                });
                _.each(result.nonfs, function(itm) {
                    items.push({
                        id: itm.id,
                        name: itm.name,
                        customType: itm.type
                    });
                });

                model.items(items);
            });
        };

        return {
            customTitle: true,
            model: model,
            tools: [],
            cols: [{
                type: "icon",
                name: function(item) {
                    if (item.customType) return ""; //TODO type icon
                    if (!isValidItem(item)) return "exclamation";

                    if (!item.is_file) return 'folder-close';
                    return 'file';
                }
            }, {
                id: 'name',
                titleKey: 'fileListColumnTitleName'
            }, {
                id: 'path',
                titleKey: 'pluginShareConfigViewPathTitle',
                content: function(item, path) {
                    if (item.customType || !item.path) return "";
                    var p = (fs.rootsById[item.root_id] ? fs.rootsById[item.root_id].name : item.root_id) + ":";
                    var path = item.path.substring(0, item.path.length - (item.name.length + (item.is_file ? 0 : 1)));
                    return p + "/" + path;
                }
            }, {
                id: "count",
                titleKey: 'pluginShareConfigViewCountTitle',
                content: function(item) {
                    return model.shares[item.id].length;
                }
            }, {
                id: 'edit',
                type: 'action',
                icon: 'edit',
                title: '',
                visible: function(item) {
                    return isValidItem(item);
                },
                action: function(item) {
                    share.openItemShares(item);
                }
            }, {
                id: 'trash',
                type: 'action',
                icon: 'trash',
                title: '',
                action: function(item) {
                    repository.removeAllItemShares(item).done(refresh);
                }
            }],
            rowClass: function(item) {
                if (isValidItem(item)) return "";
                return "error";
            },
            activate: function() {
                refresh();
            }
        };
    };
});
