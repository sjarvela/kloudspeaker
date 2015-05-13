define(['kloudspeaker/plugins', 'kloudspeaker/events', 'kloudspeaker/session', 'kloudspeaker/trashbin/fileview'], function(plugins, events, session, TrashBinFileView) {
    var fileview = new TrashBinFileView();

    plugins.register({
        id: "plugin-trashbin",
        backendPluginId: "TrashBin",
        initialize: function() {
            var onSession = function() {
                var s = session.get();
                var softDelete = (s && s.plugins["TrashBin"] && s.data.plugins["TrashBin"]["soft_delete"]);
                fileview.init(softDelete);
            };
            events.addEventHandler(onSession, "session/start");
            if (session.get()) onSession();
        },
        resources: {
            texts: true,
            css: true
        },
        fileViewHandler: fileview
    });
});
