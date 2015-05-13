define(['kloudspeaker/plugins', 'kloudspeaker/events', 'kloudspeaker/session', 'kloudspeaker/trashbin/fileview'], function(plugins, events, session, fileview) {
    var that = this;

    this.initialize = function() {
        that._timestampFormatter = new uif.Timestamp(texts.get('shortDateTimeFormat'));

        var onSession = function() {
            var s = session.get();
            var softDelete = (s && s.plugins["TrashBin"] && s.data.plugins["TrashBin"]["soft_delete"]);
            fileview.init(softDelete);
        };
        events.addEventHandler(onSession, "session/start");
        if (session.get()) onSession();
    };

    plugins.register({
        id: "plugin-trashbin",
        backendPluginId: "TrashBin",
        initialize: that.initialize,
        resources: {
            texts: true,
            css: true
        },
        fileViewHandler: fileview
    });
});
