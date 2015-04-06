define(['kloudspeaker/core', 'kloudspeaker/instance', 'kloudspeaker/config', 'kloudspeaker/features', 'kloudspeaker/permissions', 'kloudspeaker/filesystem', 'kloudspeaker/ui', 'kloudspeaker/ui/files', 'knockout'], function(core, ks, config, features, permissions, fs, ui, uif, ko) {
    console.log("quickactions module");

    var model = {
        item: ko.observable(null),
        loading: ko.observable(false),
        actions: ko.observableArray([])
    };

    var $activeActions = null;
    var reset = function() {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = false;

        if ($activeActions) $activeActions.hide();
        $activeActions = false;

        model.item(null);
        model.loading(false);
        model.actions([]);
    };
    var showActions = function(item) {
        if ($activeActions) $activeActions.hide();
        $activeActions = false;

        // find DOM elements where info is rendered into
        var $itemElement = model.activeListWidget.getItemDOMObject(item);
        var $container = $itemElement.find(".quickactions-container").hide();

        model.loading(true);

        var actions = core.actions.getById(config['file-view']['quick-actions'], item);
        //TODO valid
        model.actions(actions);

        $("#files-view-quickactions").remove().appendTo($container.empty());
        $activeActions = $container.show();

        //TODO get actions
        model.loading(false);
        model.item(item);
    };

    var hoverTimeout = false;
    var outTimeout = false;
    ks.on('files-view:load').then(function(files) {
        $(".filelist-item").hover(function() {
            var t = this;
            var $t = $(this);
            if (outTimeout) clearTimeout(outTimeout);
            outTimeout = false;

            var oldItem = model.item();
            var item = ko.dataFor(this);

            // same item already visible, just cancel
            if ($activeActions && oldItem && item.id == oldItem.id) {
                return;
            }

            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(function() {
                showActions(item);
            }, 500);
        }, function() {
            if (outTimeout) clearTimeout(outTimeout);
            outTimeout = setTimeout(function() {
                reset();
            }, 500);
        });
    });

    return {
        activate: function(data) {
            model.activeListWidget = data.model.activeListWidget;
            reset();
        },
        model: model,
        onAction: function(ac) {
            var item = model.item();
            reset();
            core.actions.trigger(ac, item);
        }
    }
});
