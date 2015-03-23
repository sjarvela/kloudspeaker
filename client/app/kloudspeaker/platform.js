define("kloudspeaker/core_service", ['kloudspeaker/service'],
    function(service) {
        var cs = service.get(); //("api/v1/");
        return cs;
    }
);

define("kloudspeaker/plugins", ['durandal/app'],
    function(app) {
        var plugins = {};
        app.on('session:start').then(function(session) {
            if (!session) plugins = {};
            else plugins = session.plugins;
        });
        return {
            get: function(id) {
                if (id === undefined) return plugins;
                return plugins[id];
            },
            exists: function(id) {
                return !!plugins[id];
            }
        }
    }
);

define("kloudspeaker/resources", ['kloudspeaker/config', 'kloudspeaker/plugins'],
    function(config, plugins) {
        return {
            getPluginUrl: function(pluginId, path) {
                var pl = plugins.get(pluginId);
                if (!pl) return null;

                //TODO
                var url = pl.url;
                if (path) url = url + path;
                //TODO map
                return url;
            }
        }
    }
);

define('kloudspeaker/ui/files', [], function() {
    var itemDetailsProviders = [];
    return {
        itemDetails: {
            registerProvider: function(h) {
                itemDetailsProviders.push(h);
            },
            getRequestData: function(item) {
                var r = {};
                _.each(itemDetailsProviders, function(h) {
                    if (!h.getRequestData) return;
                    var hd = h.getRequestData(item);
                    if (!hd) return;
                    r[h.id] = hd;
                });
                return r;
            },
            get: function(item, data) {
                var r = [];
                _.each(itemDetailsProviders, function(h) {
                    var hi = h.get(item, data, h.id ? data.plugins[h.id] : null);
                    if (!hi) return;
                    r.push(hi);
                });
                return r;
            }
        }
    }
});

define('kloudspeaker/ui/formatters', ["i18next", ], function(i18n) {
    var formatters = {
        timestamp: function(ts, ctx) {
            if (ts == null) return "";
            var fmt = null;
            if (ctx && ctx.format) fmt = ctx.format;
            else fmt = i18n.t('datetime-full');

            if (typeof(ts) === 'string') ts = kloudspeaker.utils.parseInternalTime(ts);
            return ts.toString(fmt);
        }
    };
    return {
        all: formatters,
        register: function(id, f) {
            formatters[id] = f;
        }
    }
});

define([
    "kloudspeaker/core",
    "kloudspeaker/ui/formatters",
    "kloudspeaker/resources",
    "durandal/composition",
    "knockout",
    "jquery",
    "i18next",
    "bootstrap",
    "knockout-bootstrap",
    "underscore"
], function(core, formatters, res, composition, ko, $, i18n) {
    var _i18n = function(e, va) {
        var value = ko.unwrap(va());
        var loc = i18n.t(value) || '';
        var $e = $(e);
        var target = $e.attr('data-i18n-bind-target');
        if (target && target != 'text')
            $a.attr(target, loc);
        else
            $e.text(loc);
    }
    composition.addBindingHandler('i18n', {
        init: _i18n,
        update: _i18n
    });

    var _fmt = function(e, va) {
        var value = ko.unwrap(va());
        var $e = $(e);
        var formatter = $e.attr('data-formatter');
        var ctx = null;
        $e.text(formatters.all[formatter](value, ctx));
    }
    composition.addBindingHandler('format', {
        init: _fmt,
        update: _fmt
    });
});
