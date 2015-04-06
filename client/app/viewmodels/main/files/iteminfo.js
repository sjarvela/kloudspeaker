define(['kloudspeaker/core', 'kloudspeaker/features', 'kloudspeaker/permissions', 'kloudspeaker/filesystem', 'kloudspeaker/ui', 'kloudspeaker/ui/files', 'knockout'], function(core, features, permissions, fs, ui, uif, ko) {
    console.log("iteminfo module");

    var model = {
        item: ko.observable(null),
        loading: ko.observable(false),
        data: ko.observable(null),
        details: ko.observableArray([]),
        showDescription: ko.observable(false),
        canEditDescription: ko.observable(false),
        metadata: ko.observable(null),
        activeDetails: ko.observable(null)
    };

    var $activeInfo = null;
    var reset = function() {
        model.loading(false);
        model.data(null);
        model.details([]);
        model.activeDetails(null);
    };
    var showItemInfo = function(item) {
        if ($activeInfo) $activeInfo.hide();
        reset();

        var oldItem = model.item();

        // same item clicked, just close
        if (oldItem && item.id == oldItem.id) {
            model.item(null);
            return;
        }

        // find DOM elements where info is rendered into
        var $itemElement = model.activeListWidget.getItemDOMObject(item);
        var $container = $itemElement.find(".iteminfo-container").hide();

        model.loading(true);

        $("#files-view-iteminfo").remove().appendTo($container);
        $container.slideDown();
        $activeInfo = $container;

        fs.itemInfo(item.id, uif.itemDetails.getRequestData(item)).done(function(r) {
            model.loading(false);
            model.data(r);
            model.metadata(r.metadata || {
                description: ''
            });
            model.showDescription(features.exists('descriptions'));
            model.canEditDescription(permissions.hasFilesystemPermission(item, 'edit_description'));

            var details = uif.itemDetails.get(item, r);
            model.details(details);
            model.activeDetails((details && details.length > 0) ? details[0] : null);

            model.item(item);
        });
    };

    core.actions.register({
        id: 'files/info',
        type: 'filesystem',
        titleKey: 'core.action.filesystem.open',
        handler: function(item, ctx) {
            console.log("info " + item.name);

            var av = ui.views.getActiveView();
            if (!av || av.id != 'files') return;

            $activeInfo ? $activeInfo.slideUp({
                complete: function() {
                    showItemInfo(item);
                }
            }) : showItemInfo(item);
        }
    });
    return {
        activate: function(data) {
            //console.log("iteminfo");
            //console.log(data);
            model.activeListWidget = data.model.activeListWidget;
            $activeInfo = null;
            reset();
        },
        setActiveDetails: function(d) {
            var c = model.activeDetails();
            if (c) c.active = false;

            d.active = true;
            model.activeDetails(d);
        },
        setDescription: function(d) {
            fs.setItemDescription(model.item(), d).done(function() {
                var md = model.metadata();
                md.description = d;
                model.metadata(md);
            });
        },
        model: model
    }
});
