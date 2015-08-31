define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/events', 'kloudspeaker/session', 'kloudspeaker/dom', 'kloudspeaker/ui/views', 'kloudspeaker/trashbin/fileview'], function(settings, plugins, events, session, dom, views, TrashBinFileView) {
    var that = this;
    var _softDelete = false;
    var initialized = false;
    
    var initialize = function() {
        if (initialized) return;
        initialized = true;

        var s = session.get();
        _softDelete = (s && s.plugins["TrashBin"] && s.data.plugins["TrashBin"]["soft_delete"]);
    };
    if (session.get()) initialize();
    events.on("session/start", initialize);

    views.registerFileViewHandler(new TrashBinFileView({
        isSoftDelete: function() {
            return _softDelete;
        }
    }));

    if (settings.dev)
        views.registerConfigView({
            viewId: 'trash',
            title: 'i18n:pluginTrashbinManageTitle',
            model: 'kloudspeaker/trashbin/manage',
            admin: true
        });

    plugins.register({
        id: "plugin-trashbin",
        backendPluginId: "TrashBin",

        resources: {
            texts: true,
            css: true
        }
    });
});
