define([], function() {
    //TODO remove global references



    return {
        start: function(s, p) {
            var df = $.Deferred();
            //window.Modernizr.testProp("touch");

            settings = $.extend(true, {}, kloudspeaker_defaults, s);
            // don't merge file list columns
            if (s["file-view"]["file-list-columns"]) settings["file-view"]["file-list-columns"] = s["file-view"]["file-list-columns"];
            define('kloudspeaker/settings', [], settings);
            kloudspeaker.settings = settings; //TODO remove

            // legacy, remove
            require(['kloudspeaker/app', 'kloudspeaker/ui', 'kloudspeaker/plugins', 'kloudspeaker/request', 'kloudspeaker/events', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/utils', 'kloudspeaker/templates', 'kloudspeaker/features', 'kloudspeaker/dom'], function(app, ui, plugins, request, events, service, filesystem, utils, templates, features, dom) {
                kloudspeaker.helpers = utils; //remove when global "kloudspeaker" not needed
                kloudspeaker.ui = ui; //remove when global "kloudspeaker" not needed
                kloudspeaker.plugins = plugins; //remove when global "kloudspeaker" not needed
                kloudspeaker.request = request; //remove when global "kloudspeaker" not needed
                kloudspeaker.events = events; //remove when global "kloudspeaker" not needed
                kloudspeaker.service = service; //remove when global "kloudspeaker" not needed
                kloudspeaker.filesystem = filesystem; //remove when global "kloudspeaker" not needed
                kloudspeaker.templates = templates; //remove when global "kloudspeaker" not needed
                kloudspeaker.features = features; //remove when global "kloudspeaker" not needed
                kloudspeaker.dom = dom; //remove when global "kloudspeaker" not needed

                app.init(p).done(df.resolve).fail(df.reject);
            });

            return df;
        }
    };
});
