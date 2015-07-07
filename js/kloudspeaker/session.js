define(['kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/utils'], function(service, events, utils) {
    //TODO remove global session

    var session = false;
    var init = function() {
        service.get("session/info/").fail(function() {
            //TODO rewrite
            new kloudspeaker.ui.FullErrorView('Failed to initialize Kloudspeaker').show();
        }).done(function(s) {
            onStart(s);
        });
    };
    var onStart = function(s) {
        var user = s.authenticated ? {
            id: s.user_id,
            name: s.username,
            type: s.user_type,
            lang: s.lang,
            admin: s.user_type == 'a',
            permissions: s.permissions,
            auth: s.user_auth,
            /*hasPermission: function(name, required) {
                return utils.hasPermission(s.permissions, name, required);
            }*/
        } : null;

        session = {
            id: s.session_id,
            user: user,
            features: s.features,
            plugins: s.plugins,
            data: s,
            version: s.version,
            revision: s.revision
        };

        kloudspeaker.session = session; //TODO remove

        events.dispatch('session/start', session);
    };

    return {
        init: init,
        authenticate: function(username, password, remember) {
            return service.post("session/authenticate/", {
                username: username,
                password: utils.base64.encode(password),
                remember: remember
            }).done(function(s) {
                onStart(s);
            });
        },
        end: function() {
            session = false;
            kloudspeaker.session = false; //TODO remove

            return service.post("session/logout").done(function(s) {
                events.dispatch('session/end');
                init();
            });
        },
        get: function() {
            return session;
        }
    };
});
