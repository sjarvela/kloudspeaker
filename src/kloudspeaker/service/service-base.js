import {
    Lazy, inject, LogManager
}
from 'aurelia-framework';

import {
    app_config
}
from 'app-config';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import $ from 'jquery';

/*import {
    Cookies
}
from "cookies";*/

let logger = LogManager.getLogger('service');

@
inject(EventAggregator)
export class ServiceBase {
    _sessionId = null;

    constructor(events) {
        logger.debug("Service");
        
        // get initial sessionId from cookie
        //this._sessionId = Cookies.get('kloudspeaker_app_session');

        var that = this;

        events.subscribe('kloudspeaker/session/start', function(s) {
            that._sessionId = that.session.getId();
        });
        events.subscribe('kloudspeaker/session/end', function(s) {
            that._sessionId = null;
        });
    }

    initialize(session) {
        this.session = session;
    }

    get(path) {
        return this._doRq('get', path);
    }

    post(path, data) {
        return this._doRq('post', path, data);
    }

    _doRq(method, path, data) {
        var that = this;
        var url = app_config.service.url + "/r.php/" + path;
        /*var opt = {
            method: 'get'
        };
        if (method && method != 'get') {
            opt.method = 'post';
            opt.body = data ? JSON.stringify(data) : null;
        }
        if (this.sessionId) {
            opt.headers = {
                "kloudspeaker-session-id": sessionId
            }
        }*/
        var startSessionId = this._sessionId;
        return new Promise(function(resolve, reject) {
            $.ajax({
                type: method,
                url: url,
                processData: false,
                data: data ? JSON.stringify(data) : null,
                contentType: 'application/json',
                dataType: 'json',
                beforeSend: function(xhr) {
                    if (that._sessionId)
                        xhr.setRequestHeader("kloudspeaker-session-id", that._sessionId);
                    //if (st._limitedHttpMethods || diffMethod)
                    //    xhr.setRequestHeader("kloudspeaker-http-method", type);
                }
            }).pipe(function(r) {
                if (!r) {
                    reject({
                        code: 999
                    });
                }
                resolve(r.result);
            }, function(xhr) {
                var df = $.Deferred();

                // if session has expired since starting request, ignore it
                if (that._sessionId != startSessionId) return df;

                var error = false;
                var data = false;

                if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                if (!error) error = {
                    code: 999
                }; //unknown

                if (error.code == 100 && that.session.isLoggedIn()) {
                    that.session.end(true);
                    //failContext.handled = true;
                }

                /*var failContext = {
                    handled: false
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
                return df.rejectWith(failContext, [error]);*/
                reject(error);
            })
        });
        /*return new Promise(function(resolve, reject) {
            that.http.fetch(path, opt).then(response => response.json()).then(data => {
                logger.debug(data);

                if (data.success == false) reject();
                else if (data.result) resolve(data.result);
                else reject();
            }).catch(() => {
                logger.error("Request failed");
                reject();
            });
        });*/
    }
}
