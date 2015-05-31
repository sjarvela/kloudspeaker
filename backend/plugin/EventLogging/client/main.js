define(['kloudspeaker/app', 'kloudspeaker/plugins', 'kloudspeaker/session', 'kloudspeaker/ui/views'], function(app, plugins, session, views) {
    var that = this;

    views.registerConfigView({
        viewId: 'newevents',
        title: 'i18n:pluginEventLoggingAdminNavTitle',
        model: 'kloudspeaker/eventlogging/admin',
        admin: true
    });
});
