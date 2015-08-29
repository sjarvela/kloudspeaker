define(['kloudspeaker/instance', 'kloudspeaker/plugins', 'kloudspeaker/session', 'kloudspeaker/ui/views'], function(app, plugins, session, views) {
    var that = this;

    views.registerView("registration", function(rqParts, urlParams) {
        if (rqParts.length != 2) return false;
        var viewId = rqParts[1];

        if (viewId == "new") {
            return {
                model: ["kloudspeaker/registration/views/register", {
                    urlParams: urlParams
                }]
            };
        } else if (viewId == "confirm") {
            return {
                model: ["kloudspeaker/registration/views/confirm", {
                    urlParams: urlParams
                }]
            };
        } else if (viewId == "approve") {
            var s = session.get();
            if (!s || !s.user) return false;
            if (!s.user.admin && !s.user.hasPermission('manage_user_registrations')) return false;
            return {
                model: ["kloudspeaker/registration/views/approve", {
                    urlParams: urlParams
                }]
            };
        }
        return false;
    });

    plugins.register({
        id: "plugin-registration",
        backendPluginId: "Registration",
        resources: {
            texts: true
        },
        openRegistration: function() {
            app.openPage('registration/new');
        }
    });
});
