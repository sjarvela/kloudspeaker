define(['kloudspeaker/ui/views'], function(views) {
    views.registerConfigView({
        viewId: 'notificator',
        title: 'i18n:pluginNotificatorAdminNavTitle',
        model: 'kloudspeaker/notificator/admin',
        view: '#kloudspeaker-tmpl-empty',
        admin: true
    });
});
