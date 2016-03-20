define(['kloudspeaker/plugins', 'kloudspeaker/ui/views', 'kloudspeaker/localization'], function(plugins, views, localization) {
    localization.registerPluginResource('EventLogging');

    views.registerConfigView({
        viewId: 'events',
        title: 'i18n:pluginEventLoggingAdminNavTitle',
        model: 'kloudspeaker/eventlogging/admin',
        admin: true
    });
});
