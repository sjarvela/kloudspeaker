define(['jquery', 'kloudspeaker/config', 'durandal/app'],
    function($, config, da) {
        var _sessionId = false;

        da.on('session:start').then(function(session) {
            _sessionId = session.id;
        });
        da.on('session:end').then(function(session) {
            _sessionId = false;
        });

        var _limitedHttpMethods = !!config['limited-http-methods'];
        var _restPath = config['rest-path'];

        var _serviceInstance = function(prefix) {
            var urlFn = function(u, full) {
                if (u.startsWith('http')) return u;
                var url = _restPath + "r.php/" + (prefix || '') + u;
                if (!full) return url;
                return "TODO" + url; //kloudspeaker.App.pageUrl + url;
            };
            var doRequest = function(type, url, data) {
                var t = type;
                var diffMethod = (_limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
                if (diffMethod) t = 'POST';

                return (function(sid) {
                    return $.ajax({
                        type: t,
                        url: urlFn(url),
                        processData: false,
                        data: data ? JSON.stringify(data) : null,
                        contentType: 'application/json',
                        dataType: 'json',
                        beforeSend: function(xhr) {
                            if (sid)
                                xhr.setRequestHeader("kloudspeaker-session-id", sid);
                            if (_limitedHttpMethods || diffMethod)
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

                        // if session has expired since starting request, ignore it
                        if (_sessionId != sid) return df;

                        var error = false;
                        var data = false;

                        if (xhr.responseText && xhr.responseText.startsWith('{')) {
                            try {
                                error = JSON.parse($.trim(xhr.responseText));
                            } catch (e) {
                                error = {
                                    code: 999,
                                    details: "Could not parse error JSON, response: [" + xhr.responseText + "]"
                                };
                            }
                        }
                        if (!error) error = {
                            code: 999
                        }; //unknown

                        var failContext = {
                            handled: false
                        }
                        if (error.code == 100 && _sessionId) {
                            app.trigger('error:unauthorized');
                            failContext.handled = true;
                        }
                        // push default handler to end of callback list
                        setTimeout(function() {
                            df.fail(function(err) {
                                if (!failContext.handled) window.alert(JSON.stringify(err)); //TODO kloudspeaker.ui.dialogs.showError(err);
                            });
                        }, 0);
                        return df.rejectWith(failContext, [error]);
                    }).promise()
                }(_sessionId));
            };
            return {
                prefix: prefix,
                url: urlFn,

                get: function(url) {
                    return doRequest("GET", url, null);
                },

                post: function(url, data) {
                    return doRequest("POST", url, data);
                },

                put: function(url, data) {
                    return doRequest("PUT", url, data);
                },

                del: function(url, data) {
                    return doRequest("DELETE", url, data);
                },

                withPrefix: function(prefix) {
                    return _serviceInstance(prefix);
                }
            };
        };
        return {
            get: function(prefix) {
                return _serviceInstance(prefix || "");
            }
        };
    }
);
