define(['kloudspeaker/settings', 'kloudspeaker/dom', 'kloudspeaker/localization', 'kloudspeaker/utils'], function(settings, dom, loc, utils) {
    var pl = {};
    var session = null;

    pl._list = {};

    //remove session?
    pl.setup = function() {
        session = require('kloudspeaker/session');
    }

    pl.register = function(p) {
        var id = p.id;
        if (!id) return;
        if (pl._list[id]) return;

        pl._list[id] = p;
    };

    pl.initialize = function(cb) {
        var df = $.Deferred();
        var l = [];
        for (var id in pl._list) {
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
        return df.promise();
    };

    pl.load = function(list) {
        var df = $.Deferred();
        if (!list) return df.resolve();

        var l = [];
        $.each(utils.getKeys(list), function(i, k) {
            var p = list[k];
            if (p.client_plugin) l.push(dom.importScript(p.client_plugin));
        });
        if (l.length === 0) return df.resolve();

        $.when.apply($, l).done(function() {
            pl.initialize().done(df.resolve);
        });
        return df;
    };

    pl.get = function(id) {
        if (!window.def(id)) return pl._list;
        return pl._list[id];
    };

    pl.exists = function(id) {
        return !!pl._list[id];
    };

    pl.url = function(id, p, admin) {
        var s = session.get();
        var ps = s && s.data.plugins[id];
        var custom = (ps && ps.custom);

        var url = custom ? s.data.resources.custom_url : settings["service-path"];
        url = url + "plugin/" + id;

        if (!p) return url;
        return url + (admin ? "/admin/" : "/client/") + p;
    };

    pl.adminUrl = function(id, p) {
        return pl.url(id) + "/admin/" + p;
    };

    pl.getLocalizationUrl = function(id) {
        return pl.url(id) + "/localization/texts_" + loc.locale + ".json";
    };

    pl.getStyleUrl = function(id, admin) {
        return pl.url(id, "style.css", admin);
    };

    pl.getItemContextRequestData = function(item) {
        var requestData = {};
        for (var id in pl._list) {
            var plugin = pl._list[id];
            if (!plugin.itemContextRequestData) continue;
            var data = plugin.itemContextRequestData(item);
            if (!data) continue;
            requestData[id] = data;
        }
        return requestData;
    };

    pl.getItemContextPlugins = function(item, ctx) {
        var data = {};
        if (!ctx) return data;
        var d = ctx.details;
        if (!d || !d.plugins) return data;
        for (var id in pl._list) {
            var plugin = pl._list[id];
            if (!plugin.itemContextHandler) continue;
            var pluginData = plugin.itemContextHandler(item, ctx, d.plugins[id]);
            if (pluginData) data[id] = pluginData;
        }
        return data;
    };

    pl.getItemCollectionPlugins = function(items, ctx) {
        var data = {};
        if (!items || !utils.isArray(items) || items.length < 1) return data;

        for (var id in pl._list) {
            var plugin = pl._list[id];
            if (!plugin.itemCollectionHandler) continue;
            var pluginData = plugin.itemCollectionHandler(items, ctx);
            if (pluginData) data[id] = pluginData;
        }
        return data;
    };

    pl.getMainViewPlugins = function() {
        var plugins = [];
        for (var id in pl._list) {
            var plugin = pl._list[id];
            if (!plugin.mainViewHandler) continue;
            plugins.push(plugin);
        }
        return plugins;
    };

    pl.getFileViewPlugins = function() {
        var plugins = [];
        for (var id in pl._list) {
            var plugin = pl._list[id];
            if (!plugin.fileViewHandler) continue;
            plugins.push(plugin);
        }
        return plugins;
    };

    pl.getConfigViewPlugins = function() {
        var plugins = [];
        for (var id in pl._list) {
            var plugin = pl._list[id];
            if (!plugin.configViewHandler) continue;
            plugins.push(plugin);
        }
        return plugins;
    };

    return pl;
});
