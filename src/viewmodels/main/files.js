define(['plugins/router', 'kloudspeaker/config', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/core', 'kloudspeaker/ui/files', 'knockout', 'jquery'], function(router, config, session, fs, core, uif, ko, $) {
    core.actions.register({
        id: 'filesystem/open',
        type: 'filesystem',
        titleKey: 'core.action.filesystem.open',
        handler: function(item) {
            if (item.is_file) {
                alert("open " + item.name);
                return;
            }
            router.navigate("files/" + item.id);
        }
    });

    // item info
    uif.itemDetails.registerProvider({
        get: function(item) {
            return {
                titleKey: "files.iteminfo.title",
                module: 'viewmodels/main/files/iteminfo',
            }
        }
    });

    var $activeDetails = null;
    core.actions.register({
        id: 'view/details',
        type: 'filesystem',
        titleKey: 'core.action.filesystem.open',
        handler: function(item, ctx) {
            console.log("details " + item.name);
            if (!model.activeListWidget) return;

            var oldItem = model.itemDetails.item();
            var $itemElement = model.activeListWidget.getItemDOMObject(item);

            //var $all = $(".item-details-container");
            var showDetails = function() {
                if ($activeDetails) $activeDetails.hide();

                var itemDetails = model.itemDetails;
                itemDetails.loading(false);
                itemDetails.data(null);
                itemDetails.details([]);
                itemDetails.activeDetails(null);

                // same item clicked, just close
                if (oldItem && item.id == oldItem.id) {
                    itemDetails.item(null);
                    return;
                }

                var $container = $itemElement.find(".item-details-container").hide();

                itemDetails.item(item);
                itemDetails.loading(true);

                $("#files-view-item-details").remove().appendTo($container);
                $container.slideDown();
                $activeDetails = $container;

                fs.itemInfo(item.id, uif.itemDetails.getRequestData(item)).done(function(r) {
                    itemDetails.loading(false);
                    itemDetails.data(r);

                    var d = uif.itemDetails.get(item, r);
                    itemDetails.details(d);
                    itemDetails.activeDetails((d && d.length > 0) ? d[0] : null);
                });
            };
            $activeDetails ? $activeDetails.slideUp({
                complete: showDetails
            }) : showDetails();
        }
    });

    var viewTypes = [{
        id: 'list',
        icon: 'fa-list',
        module: 'main/files/list',
        template: 'views/main/files/list'
    }, {
        id: 'icon-small',
        icon: 'fa-th',
        module: 'main/files/icon',
        template: 'views/main/files/icon'
    }, {
        id: 'icon-large',
        icon: 'fa-th-large',
        module: 'main/files/icon',
        template: 'views/main/files/icon'
    }];
    var model = {
        loading: ko.observable(false),

        viewTypes: viewTypes,
        viewType: ko.observable(viewTypes[0]),
        activeListWidget: null,

        roots: [],
        root: ko.observable(null),
        hierarchy: ko.observableArray([]),
        items: ko.observableArray([]),
        folder: ko.observable(null),

        itemDetails: {
            item: ko.observable(null),
            loading: ko.observable(false),
            data: ko.observable(null),
            details: ko.observableArray([]),
            activeDetails: ko.observable(null),
            setActiveDetails: function(d) {
                model.itemDetails.activeDetails(d);
            }
        }
    };
    var onListWidgetReady = function(o) {
        model.activeListWidget = o;
        reload();
    };
    var reset = function() {
        model.root(null);
        model.hierarchy([]);
        model.items([]);
        model.folder(null);
    };
    var reload = function() {
        model.loading(true);
        if (!model.activeListWidget) return;

        var rqData = {};
        if (model.activeListWidget.getRequestData) rqData = model.activeListWidget.getRequestData(model.folderId);

        console.log("Files load " + model.folderId);
        fs.folderInfo(model.folderId || 'roots', rqData).then(function(r) {
            model.loading(false);
            model.items(r.items);
            model.root(r.hierarchy ? r.hierarchy[0] : null);
            model.hierarchy((r.hierarchy && r.hierarchy.length > 1) ? r.hierarchy.slice(1) : []);
            model.folder(r.item);
        });
    };
    return {
        activate: function(id) {
            console.log('files activate');

            model.roots = fs.roots();
            model.folderId = id;
            reset();
            if (model.activeListWidget) reload();

            return true;
        },
        model: model,
        onItemClick: function(item, e) {
            this.onItemAction(item, "click", e);
        },
        onItemAction: function(item, action, ctx) {
            var itemAction = config["file-view"].actions[action];
            if (!itemAction) return;
            if (typeof(itemAction) == "function") itemAction = itemAction(item);

            console.log(item.name + " " + itemAction);
            if (itemAction == "menu") {
                //$scope.showPopupmenu(ctx.e, item, actions.getType('filesystem', item));
            } else {
                core.actions.trigger(itemAction, item, ctx);
            }
        },
        setViewType: function(v) {
            reset();
            model.activeListWidget = null;
            model.viewType(v);
        },
        onListWidgetReady: onListWidgetReady
    };
});

define('main/files/list', ['knockout'], function(ko) {
    var parentModel = null;
    var cols = [{
        id: 'name',
        title: 'Name',
        content: function(item) {
            return item.name;
        }
    }, {
        id: 'extension',
        title: 'Extension',
        content: function(item) {
            return item.extension;
        }
    }];

    var getCtx = function(col, item, e) {
        var $e = $(e.target);
        return {
            e: e,
            col: col,
            element: $e,
            colElement: $e.closest(".col"),
            itemElement: $e.closest(".filelist-item")
        };
    };
    var onCellClick = function(col, item, e) {
        parentModel.onItemAction(item, "click", getCtx(col, item, e));
    };
    var onCellDblClick = function(col, item, e) {
        parentModel.onItemAction(item, "dbl-click", getCtx(col, item, e));
    };
    var onCellRightClick = function(col, item, e) {
        parentModel.onItemAction(item, "right-click", getCtx(col, item, e));
        return false;
    };
    var getRequestData = function() {
        console.log('file list rq');
        return {
            foo: "bar"
        };
    };
    return {
        model: null,
        cols: cols,
        activate: function(p) {
            console.log('files list activate');

            parentModel = p;
            this.model = parentModel.model;

            parentModel.onListWidgetReady({
                getItemDOMObject: function(item) {
                    return $("#filelist-item-" + item.id);
                },
                getRequestData: getRequestData
            });
        },
        attached: function(v, p) {
            var clicks = 0,
                clickElement = null;
            $(v).on('click', '.filelist-item-value', function(e) {
                if (!clickElement || clickElement != this) clicks = 0;
                var ctx = ko.contextFor(this);

                clicks++;
                clickElement = this;

                if (clicks == 1) {
                    setTimeout(function() {
                        if (clicks == 1) {
                            onCellClick(ctx.col, ctx.item, e);
                        } else {
                            onCellDblClick(ctx.col, ctx.item, e);
                        }
                        clicks = 0;
                    }, 300);
                }
            }).on('contextmenu', '.filelist-item-value', function(e) {
                var ctx = ko.contextFor(this);
                return onCellRightClick(ctx.col, ctx.item, e);
            });
        },
        getCell: function(col, item) {
            return col.content(item);
        }
    };
});

define('main/files/icon', function() {
    var parentModel = null;

    return {
        model: null,
        large: false,
        activate: function(p) {
            console.log('files icon list activate');

            parentModel = p;
            this.model = parentModel.model;
            this.large = (parentModel.model.viewType().id == 'icon-large');

            parentModel.onListWidgetReady({});
        },
        onItemClick: function(item) {
            parentModel.onItemClick(item);
        }
    };
});
