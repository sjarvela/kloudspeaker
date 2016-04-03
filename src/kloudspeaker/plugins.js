import {
    bindable,
    inject,
    LogManager
}
from 'aurelia-framework';

import {
    Session
}
from 'kloudspeaker/session';

import {
    app_config
}
from 'app-config';

import _ from 'underscore';

@
inject(Session, app_config)
export class Plugins {
    plugins = {};

    constructor(session, appConfig) {
        this.session = session;
        this.appConfig = appConfig;
    }

    load() {
        var wait = [];
        var that = this;
        var sessionData = this.session.getData();
        _.each(_.keys(sessionData.plugins), function(pid) {
            wait.push(that.register(pid, sessionData.plugins[pid]));
        });
        if (wait.length === 0) return Promise.resolve();
        return Promise.all(wait);
        /*for (var id in pl._list) {
            var p = pl._list[id];
            if (p.initialized) continue;

            if (p.initialize) {
                var ps = ((settings.plugins && settings.plugins[id]) ? settings.plugins[id] : false) || {};
                p.initialize(ps);
            }
            if (p.resources) {
                var pid = p.backendPluginId || id;
                if (p.resources.texts) {
                    if (settings.texts_js)
                        l.push(dom.importScript(pl.getJsLocalizationUrl(pid)));
                    else
                        l.push(loc.loadPlugin(pid));
                }
                if (p.resources.css) dom.importCss(pl.getStyleUrl(pid));
            }
            p.initialized = true;
        }
        if (l.length === 0) {
            return df.resolve().promise();
        }
        $.when.apply($, l).done(df.resolve).fail(df.reject);
        return new Promise(function(resolve) {

        });*/
    }

    register(id, p) {
        if (typeof id === 'object') {
            p = id;
            id = p.id;
        }
        if (this.plugins[id]) return Promise.resolve();

        var pr = null;
        var that = this;

        if (p.client_module_path) {
            this.plugins[id] = p;
            p._initialized = true;

            require.config({
                packages: [{
                    name: p.client_module_id,
                    location: p.client_module_path
                }]
            });
            pr = new Promise(function(resolve) {
                require([p.client_module_id], function(cm) {
                    p.client_module = cm;
                    resolve();
                });
            });
        } else {
            this.plugins[id] = p;
            //p._initialized = true;
        }
        if (!pr) return Promise.resolve();
        return pr;
    }

    initialize() {
        var that = this;

        _.each(_.keys(this.plugins), function(pid) {
            var p = that.plugins[pid];
            if (p._initialized) return;
            p._initialized = true;

            if (p.initialize) p.initialize();
        });
    }

    get(id) {
        return this.plugins[id];
    }

    getRequestData(item, id) {
        var that = this;
        var result = {};

        _.each(_.keys(this.plugins), function(pid) {
            var p = that.plugins[pid];
            var pd = false;

            if (p.getRequestData) {
                pd = p.getRequestData(item, id);
            } else {
                //legacy
                if (id == 'item-info' && p.itemContextRequestData)
                    pd = p.itemContextRequestData(item);
            }
            if (pd) result[pid] = pd;
        });
        return result;
    }

    getUrl(id, resource, admin) {
        var ps = this.plugins[id];
        if (!ps) return null;

        var custom = (ps && ps.custom);
        var sd = this.session.getData();

        var url = custom ? sd.resources.custom_url : this.appConfig.service.url;
        url = url + "plugin/" + id;

        if (!resource) return url;
        return url + (admin ? "/admin/" : "/client/") + resource;
    }

    getContent(type, o, data) {
        var that = this;
        var result = [];

        _.each(_.keys(this.plugins), function(pid) {
            var p = that.plugins[pid];
            var pd = data[pid];

            //TODO content API?

            //legacy
            if (p.itemContextHandler) {
                var pr = p.itemContextHandler(o, {}, pd, data);
                if (pr && pr.details) {
                    var content = {
                        title: pr.details['title-key'], //localize
                        type: 'custom',
                        handler: pr.details
                    };
                    if (pr.details['on-render']) {
                        content.viewType = 'custom';
                        content.render = function($e, ctx) {
                            pr.details['on-render']({}, $e, ctx);
                        }
                    }
                    result.push(content);
                }
            }
        });
        return result;
    }
}
