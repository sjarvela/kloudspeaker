define(['kloudspeaker/app', 'kloudspeaker/plugins', 'kloudspeaker/session', 'kloudspeaker/ui/views', 'kloudspeaker/localization'], function(app, plugins, session, views, localization) {
    localization.registerPluginResource('EventLogging');

    views.registerConfigView({
        viewId: 'events',
        title: 'i18n:pluginEventLoggingAdminNavTitle',
        model: 'kloudspeaker/eventlogging/admin',
        admin: true
    });
});
