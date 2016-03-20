define(['kloudspeaker/settings', 'kloudspeaker/events', 'kloudspeaker/localization'], function(settings, events, loc) {
    var session = null;
    var dialogs = null; //TODO remove
    var ui = null; //TODO remove

    var _baseUrl = "";
    var _limitedHttpMethods = false;
    var _serviceParam = !!settings["service-param"];

    var st = {};

    events.addEventHandler(function(e) {
        var s = session.get();
        _limitedHttpMethods = !!s.features.limited_http_methods;
    }, 'session/start');

    st.setup = function() {
        session = require('kloudspeaker/session');
        dialogs = require('kloudspeaker/ui/dialogs'); //TODO remove
        ui = require('kloudspeaker/ui'); //TODO remove
    }

    st.initialize = function(baseUrl) {
        _baseUrl = baseUrl;
    };

    st.url = function(u, full) {
        if (u.startsWith('http')) return u;
        var url = settings["service-path"] + "r.php";
        var path = u;

        if (_serviceParam) path = "?sp=" + path.replace('?', '&');
        else path = "/" + path;

        url = url + path;
        if (!full) return url;
        return _baseUrl + url;
    };

    st.get = function(url) {
        return st._do("GET", url, null);
    };

    st.post = function(url, data) {
        return st._do("POST", url, data);
    };

    st.put = function(url, data) {
        return st._do("PUT", url, data);
    };

    st.del = function(url, data) {
        return st._do("DELETE", url, data);
    };

    st._do = function(type, url, data) {
        var t = type;
        var diffMethod = (_limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
        if (diffMethod) t = 'POST';

        var s = session.get();
        return (function(sid) {
            return $.ajax({
                type: t,
                url: st.url(url),
                processData: false,
                data: data ? JSON.stringify(data) : null,
                contentType: 'application/json',
                dataType: 'json',
                beforeSend: function(xhr) {
                    if (sid)
                        xhr.setRequestHeader("kloudspeaker-session-id", sid);
                    if (st._limitedHttpMethods || diffMethod)
                        xhr.setRequestHeader("kloudspeaker-http-method", type);
                }
            }).pipe(function(r) {
                if (!r) {
                    return $.Deferred().reject({
                        code: 999
                    });
                }
                return r.result;
            }, function(xhr) {
                var df = $.Deferred();
                var s = session.get();

                // if session has expired since starting request, ignore it
                if (s.id != sid) return df;

                var error = false;
                var data = false;

                if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                if (!error) error = {
                    code: 999
                }; //unknown

                var failContext = {
                    handled: false
                }

                if (error.code == 100 && s.user) {
                    session.end(true);
                    failContext.handled = true;
                }
                // push default handler to end of callback list
                setTimeout(function() {
                    df.fail(function(err) {
                        if (failContext.handled) return;
                        // request denied
                        if (err.code == 109 && err.data && err.data.items) {
                            ui.actions.handleDenied(null, err.data, loc.get('genericActionDeniedMsg'));
                        } else {
                            dialogs.showError(err);
                        }
                    });
                }, 0);
                return df.rejectWith(failContext, [error]);
            }).promise()
        }((s && s.id) ? s.id : null));
    };

    return st;
});
