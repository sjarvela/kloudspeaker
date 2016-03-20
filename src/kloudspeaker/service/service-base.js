import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    app_config
}
from 'app-config';

/*import {
    HttpClient
}
from "aurelia-fetch-client";*/
import $ from 'jquery';

import {
    Cookies
}
from "cookies";

let logger = LogManager.getLogger('service');

@
inject(app_config)
export class ServiceBase {
    sessionId = null;

    constructor(http: HttpClient, app_config) {
        logger.debug("Service");
        /*http.configure(config => {
            config
                .withBaseUrl(app_config.service.url + "/r.php/");
        });
        this.http = http;*/
        // get initial sessionId from cookie
        this.sessionId = Cookies.get('kloudspeaker_app_session');
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
        var startSessionId = this.sessionId;
        return new Promise(function(resolve, reject) {
            $.ajax({
                type: method,
                url: url,
                processData: false,
                data: data ? JSON.stringify(data) : null,
                contentType: 'application/json',
                dataType: 'json',
                beforeSend: function(xhr) {
                    if (that.sessionId)
                        xhr.setRequestHeader("kloudspeaker-session-id", that.sessionId);
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
                if (that.sessionId != startSessionId) return df;

                var error = false;
                var data = false;

                if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                if (!error) error = {
                    code: 999
                }; //unknown

                /*var failContext = {
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
