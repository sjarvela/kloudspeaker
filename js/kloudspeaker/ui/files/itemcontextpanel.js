define(['kloudspeaker/ui/files/itemcontext', 'kloudspeaker/filesystem', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/session', 'kloudspeaker/permissions', 'kloudspeaker/ui/views', 'kloudspeaker/features', 'kloudspeaker/localization', 'kloudspeaker/utils', 'kloudspeaker/dom'], function(ic, fs, plugins, service, events, session, permissions, views, features, loc, utils, dom) {
    var ict = {};
    var current = false;
    var container = false;

    ict.open = function(spec) {
        var item = spec.item;
        var $e = spec.element;
        var $c = spec.viewport;
        var $t = spec.container;
        var folder = spec.folder;

        var oldId = current ? current.id : false;
        if (current) {
            container.close();
            current = false;
        }
        if (item.id == oldId) return;

        current = item;
        container = spec.panelContainer;
        container.get().addClass("loading");

        fs.itemDetails(item, plugins.getItemContextRequestData(item)).done(function(d) {
            if (!d) {
                container.close();
                return;
            }

            var ctx = {
                details: d,
                folder: spec.folder,
                folder_writable: spec.folder_writable
            };
            var $c = dom.template("kloudspeaker-tmpl-main-itemcontext", item, {}).appendTo(container.get().removeClass("loading"));

            ic._render({
                hide: container.close
            }, $c, item, ctx);
        });
    };

    return {
        open: ict.open
    };
});
