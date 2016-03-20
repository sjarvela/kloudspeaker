define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/localization', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/ui', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/controls'], function(settings, plugins, service, loc, utils, dom, ui, dialogs, controls) {
    var that = {};

    that.onStore = function(items) {
        var df = $.Deferred();
        dialogs.input({
            title: loc.get('pluginItemCollectionStoreDialogTitle'),
            message: loc.get('pluginItemCollectionStoreDialogMessage'),
            defaultValue: "",
            yesTitle: loc.get('pluginItemCollectionStoreDialogAction'),
            noTitle: loc.get('dialogCancel'),
            handler: {
                isAcceptable: function(n) {
                    return (!!n && n.length > 0);
                },
                onInput: function(n) {
                    $.when(that._onStore(items, n)).then(df.resolve, df.reject);
                }
            }
        });
        return df.promise();
    };

    that._onStore = function(items, name) {
        return service.post("itemcollections", {
            items: items,
            name: name
        }).done(function(list) {
            //TODO show message
            that._updateNavBar(list);
        });
    };

    that.onAddItems = function(ic, items) {
        return service.post("itemcollections/" + ic.id, {
            items: utils.isArray(items) ? items : [items]
        });
    };

    that._removeCollectionItem = function(ic, items) {
        return service.del("itemcollections/" + ic.id + "/items", {
            items: utils.isArray(items) ? items : [items]
        });
    };

    that._showCollection = function(ic) {
        that._fileView.changeToFolder("ic/" + ic.id);
    };

    that.editCollection = function(ic, done) {
        service.get("itemcollections/" + ic.id).done(function(loaded) {
            dialogs.tableView({
                title: loc.get('pluginItemCollectionsEditDialogTitle', ic.name),
                buttons: [{
                    id: "close",
                    title: loc.get('dialogClose')
                }, {
                    id: "remove",
                    title: loc.get("pluginItemCollectionsEditDialogRemove"),
                    type: "secondary",
                    cls: "btn-danger secondary"
                }],
                onButton: function(btn, h) {
                    h.close();
                    if (btn.id == 'remove') that.removeCollection(ic);
                    done(btn.id == 'remove');
                },
                table: {
                    key: "item_id",
                    columns: [{
                        id: "icon",
                        title: "",
                        renderer: function(i, v, $c) {
                            $c.html(i.is_file ? '<i class="fa fa-file"></i>' : '<i class="fa fa-folder-o"></i>');
                        }
                    }, {
                        id: "name",
                        title: loc.get('fileListColumnTitleName')
                    }, {
                        id: "remove",
                        title: "",
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }]
                },
                onTableRowAction: function(d, table, id, item) {
                    if (id == "remove") {
                        that._removeCollectionItem(ic, item).done(function() {
                            table.remove(item);
                        });
                    }
                },
                onRender: function(d, $c, table) {
                    table.set(loaded.items);
                    $c.removeClass("loading");
                }
            });
        });
    };

    that._updateNavBar = function(list) {
        if (!list) return;

        that._list = list;
        var navBarItems = [];
        var itemsById = {};
        $.each(list, function(i, ic) {
            itemsById[ic.id] = ic;
            navBarItems.push({
                title: ic.name,
                obj: ic,
                callback: function() {
                    that._showCollection(ic);
                }
            })
        });
        that._collectionsNav.update(navBarItems);

        var f = that._fileView.getCurrentFolder();
        if (f.type == 'ic') that._collectionsNav.setActive(itemsById[f.id]);
    }

    that.removeCollection = function(ic) {
        return service.del("itemcollections/" + ic.id).done(that._updateNavBar);
    };

    that._onShareNavItem = function(ic) {
        if (!plugins.exists("plugin-share")) return;
        plugins.get("plugin-share").openShares({
            id: "ic_" + ic.id,
            "name": ic.name,
            shareTitle: loc.get("pluginItemCollectionShareTitle")
        });
    };

    that._getItemActions = function(ic) {
        var items = [{
            "title-key": "pluginItemCollectionsNavEdit",
            callback: function() {
                that.editCollection(ic, function(removed) {
                    var f = that._fileView.getCurrentFolder();
                    if (f.type != 'ic' || f.id != ic.id) return;

                    if (removed) that._fileView.openInitialFolder();
                    else that._fileView.refresh();
                });
            }
        }, {
            "title-key": "pluginItemCollectionsNavRemove",
            callback: function() {
                that._fileView.openInitialFolder();
                that.removeCollection(ic);
            }
        }];
        if (plugins.exists("plugin-share")) items.push({
            "title-key": "pluginItemCollectionsNavShare",
            callback: function() {
                that._onShareNavItem(ic);
            }
        });
        return items;
    }

    that._onFileViewInit = function(fv) {
        that._fileView = fv;
        that._fileView.addCustomFolderType("ic", {
            onSelectFolder: function(id) {
                var df = $.Deferred();
                service.post("itemcollections/" + id + "/data", {
                    rq_data: that._fileView.getDataRequest()
                }).done(function(r) {
                    that._collectionsNav.setActive(r.ic);

                    var fo = {
                        type: "ic",
                        id: r.ic.id,
                        name: r.ic.name
                    };
                    var data = {
                        items: r.ic.items,
                        ic: r.ic,
                        data: r.data
                    };
                    df.resolve(fo, data);
                });
                return df.promise();
            },

            onFolderDeselect: function(f) {
                that._collectionsNav.setActive(false);
            },

            onRenderFolderView: function(f, data, $h, $tb) {
                dom.template("kloudspeaker-tmpl-fileview-header-custom", {
                    folder: f
                }).appendTo($h);

                var opt = {
                    title: function() {
                        return that.data.title ? that.data.title : loc.get(that.data['title-key']);
                    }
                };
                var $fa = $("#kloudspeaker-fileview-folder-actions");
                var actionsElement = dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                    icon: 'fa fa-cog',
                    dropdown: true
                }, opt).appendTo($fa);
                controls.dropdown({
                    element: actionsElement,
                    items: that._getItemActions(data.ic),
                    hideDelay: 0,
                    style: 'submenu'
                });
                that._fileView.addCommonFileviewActions($fa);
            }
        });
    };

    that._onFileViewActivate = function($e, h) {
        that._collectionsNav = h.addNavBar({
            title: loc.get("pluginItemCollectionsNavTitle"),
            classes: "ic-navbar-item",
            items: [],
            dropdown: {
                items: that._getItemActions
            },
            onRender: ui.draganddrop ? function($nb, $items, objs) {
                ui.draganddrop.enableDrop($items, {
                    canDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return false;
                        return true;
                    },
                    dropType: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return false;
                        return "copy";
                    },
                    onDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return;
                        var item = obj.payload;
                        var ic = objs($e);
                        that.onAddItems(ic, item);
                    }
                });
            } : false
        });
        service.get("itemcollections").done(that._updateNavBar);
    };

    plugins.register({
        id: "plugin-itemcollection",

        itemCollectionHandler: function(items) {
            return {
                actions: [{
                    "title-key": "pluginItemCollectionStore",
                    callback: function() {
                        return that.onStore(items);
                    }
                }]
            };
        },
        fileViewHandler: {
            onInit: that._onFileViewInit,
            onActivate: that._onFileViewActivate
        }
    });
});
