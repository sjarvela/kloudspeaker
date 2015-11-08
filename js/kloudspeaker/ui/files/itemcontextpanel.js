define(['kloudspeaker/filesystem', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/session', 'kloudspeaker/permissions', 'kloudspeaker/ui', 'kloudspeaker/dom', 'kloudspeaker/features', 'kloudspeaker/localization', 'kloudspeaker/ui/controls', 'kloudspeaker/utils'], function(fs, plugins, service, events, session, permissions, ui, dom, features, loc, controls, utils) {
    return function(o) {
        var ict = {};
        ict._activeItemContext = false;

        ict.open = function(spec) {
            var item = spec.item;
            var $e = spec.element;
            var $c = spec.viewport;
            var $t = spec.container;
            var folder = spec.folder;

            spec.itemElement.addClass("with-panel");

            var $c = spec.itemElement.find(".kloudspeaker-filelist-item-panel-placeholder").empty();
            $c.html(item.id);

            /*fs.itemDetails(item, plugins.getItemContextRequestData(item)).done(function(d) {
                if (!d) {
                    return;
                }

                var ctx = {
                    details: d,
                    folder: spec.folder,
                    folder_writable: spec.folder_writable
                };
                
            });*/
        };

        return {
            open: ict.open
        };
    };
});
