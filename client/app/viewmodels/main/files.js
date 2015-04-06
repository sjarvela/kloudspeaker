define(['plugins/router', 'kloudspeaker/instance', 'kloudspeaker/config', 'kloudspeaker/session', 'kloudspeaker/permissions', 'kloudspeaker/filesystem', 'kloudspeaker/core', 'kloudspeaker/features', 'kloudspeaker/ui/files', 'kloudspeaker/ui', 'kloudspeaker/filesystem/dnd', 'knockout', 'jquery'], function(router, ks, config, session, permissions, fs, core, features, uif, ui, fsDnd, ko, $) {
    core.actions.register({
        id: 'filesystem/open',
        type: 'filesystem',
        icon: 'folder-open-o',
        titleKey: 'core.action.filesystem.open',
        isApplicable: function(item) {
            return !item.is_file;
        },
        handler: function(item) {
            router.navigate("files/" + item.id);
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

        dragHandler: ko.observable(null), //fsDnd.getDragHandler(),
        dropHandler: ko.observable(null) //fsDnd.getDropHandler()
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

            // trigger dnd init
            model.dragHandler(fsDnd.getDragHandler());
            model.dropHandler(fsDnd.getDropHandler());

            ks.trigger('files-view:load', { folder: r.item, items: r.items });
        });
    };
    return {
        activate: function(id) {
            console.log('files activate');

            model.roots = fs.roots();
            model.folderId = id;
            reset();
            if (model.activeListWidget) reload();

            // update files view API
            core.views.getById('files').api = {
                id: id
            };

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
