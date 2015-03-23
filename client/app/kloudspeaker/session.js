define(['jquery', 'kloudspeaker/core_service', 'durandal/app'],
    function($, service, da) {
        var _session = false;
        var _end = function() {
            _session = {
                id: false,
                user: null
            };
            da.trigger('session:end');
        };
        da.on('error:unauthorized').then(_end);

        var _set = function(s) {
            _session = {
                id: false,
                user: null
            };

            if (s) {
                var user = s.authenticated ? {
                    id: s.user_id,
                    name: s.username,
                    type: s.user_type,
                    lang: s.lang,
                    admin: s.user_type == 'a',
                    permissions: s.permissions,
                    auth: s.user_auth
                } : null;
                if (user) {
                    _session.id = s.session_id;
                    _session.user = user;
                    _session.permissions = {
                        types: s.permission_types,
                        user: s.permissions
                    }
                    _session.folders = s.folders;
                }
                _session.features = s.features;
                _session.plugins = s.plugins;
            }
            da.trigger('session:start', _session);
        };
        //_set();
        return {
            get: function() {
                return _session;
            },
            end: function() {
                var df = $.Deferred();
                service.get('session/logout').done(function(s) {
                    df.resolve(s);
                    if (s) _end(s);
                }).fail(df.reject);
                return df.promise();
            },
            init: function() {
                var df = $.Deferred();
                service.get('session/info').done(function(s) {
                    df.resolve(s);
                    if (s) _set(s);
                }).fail(df.reject);
                return df.promise();
            },
            authenticate: function(username, pw, remember) {
                return service.post('session/authenticate', {
                    username: username,
                    password: Base64.encode(pw),
                    remember: !!remember
                }).done(function(s) {
                    _set(s);
                });
            }
        };
    });
