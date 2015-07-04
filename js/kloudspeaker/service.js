define([], function() {
    //TODO remove global references

    var st = {};

    st.init = function(limitedHttpMethods, serviceParam) {
        st._limitedHttpMethods = !!limitedHttpMethods;
        st._serviceParam = !!serviceParam;
    };

    st.url = function(u, full) {
        if (u.startsWith('http')) return u;
        var url = kloudspeaker.settings["service-path"] + "r.php";
        url = url + (st._serviceParam ? ("?sp=" + u) : ("/" + u));
        if (!full) return url;
        return kloudspeaker.App.baseUrl + url;
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
        var diffMethod = (st._limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
        if (diffMethod) t = 'POST';

        return (function(sid) {
            return $.ajax({
                type: t,
                url: st.url(url),
                processData: false,
                data: data ? JSON.stringify(data) : null,
                contentType: 'application/json',
                dataType: 'json',
                beforeSend: function(xhr) {
                    if (kloudspeaker.session && kloudspeaker.session.id)
                        xhr.setRequestHeader("kloudspeaker-session-id", kloudspeaker.session.id);
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

                // if session has expired since starting request, ignore it
                if (kloudspeaker.session.id != sid) return df;

                var error = false;
                var data = false;

                if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                if (!error) error = {
                    code: 999
                }; //unknown

                var failContext = {
                    handled: false
                }
                if (error.code == 100 && kloudspeaker.session.user) {
                    kloudspeaker.events.dispatch('session/end');
                    failContext.handled = true;
                }
                // push default handler to end of callback list
                setTimeout(function() {
                    df.fail(function(err) {
                        if (failContext.handled) return;
                        // request denied
                        if (err.code == 109 && err.data && err.data.items) {
                            kloudspeaker.ui.actions.handleDenied(null, err.data, kloudspeaker.ui.texts.get('genericActionDeniedMsg'));
                        } else {
                            kloudspeaker.ui.dialogs.showError(err);
                        }
                    });
                }, 0);
                return df.rejectWith(failContext, [error]);
            }).promise()
        }(kloudspeaker.session.id));
    };

    return st;
});
