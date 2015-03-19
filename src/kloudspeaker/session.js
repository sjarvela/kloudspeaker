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
            _session = s;

            if (!s) {
                _session = {
                    id: false,
                    user: null
                };
            }
            if (!s.user) {
                _session.user = null;
            } else {
                _session.user.admin = s.user.type == 'a';
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
                return service.post('session/login', {
                    name: username,
                    password: pw,
                    remember: !!remember
                }).done(function(s) {
                    _set(s);
                });
            }
        };
    });
