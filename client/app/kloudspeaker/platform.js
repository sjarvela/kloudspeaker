define("kloudspeaker/core_service", ['kloudspeaker/service'],
    function(service) {
        var cs = service.get(); //TODO when rewriting backend ("api/v1/");
        return cs;
    }
);

define("kloudspeaker/features", ['durandal/app'],
    function(app) {
        var features = {};
        app.on('session:start').then(function(session) {
            if (!session) features = {};
            else features = session.features;
        });
        return {
            exists: function(id) {
                return !!features[id];
            }
        }
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

define("kloudspeaker/localization", ['kloudspeaker/config', 'kloudspeaker/resources', 'i18next'],
    function(cfg, res, i18n) {
        var i18NOptions = {
            detectFromHeaders: false,
            lng: cfg.language.default || window.navigator.userLanguage || window.navigator.language,
            fallbackLang: cfg.language.default,
            ns: 'app',
            //resGetPath: 'client/localizations/__lng__/__ns__.json',
            useCookie: false
        };
        var namespaces = {};
        var currentLang = i18NOptions.lng;

        //customize language loader
        i18NOptions.customLoad = function(lng, ns, options, loadComplete) {
            var url = (namespaces[ns] || "") + "client/localizations/" + lng + "/" + ns + ".json";
            //TODO map

            console.log("Load lang " + lng + "/" + ns + " => " + url);

            $.ajax({
                type: 'GET',
                contentType: 'application/json',
                url: url
            }).done(function(d) {
                loadComplete(null, d);
            }).fail(function() {
                loadComplete('Error loading localization: ' + lng + ": " + ns + " => " + url);
            });
        };

        return {
            init: function(cb) {
                i18n.init(i18NOptions, function() {
                    console.log("Localization ready");
                    if (cb) cb();
                });
            },
            addNamespace: function(ns, baseUrl, cb) {
                namespaces[ns] = baseUrl;
                i18n.loadNamespace(ns, function() {
                    if (cb) cb();
                });
            },
            setLang: function(lang) {
                console.log("set lang=" + lang + ", current=" + currentLang);
                if (lang == currentLang) return;
                currentLang = lang;
                i18n.setLng(lang);
            },
            t: i18n.t
        }
    }
);

define('kloudspeaker/dom', ['kloudspeaker/resources', 'kloudspeaker/utils', 'jquery'], function(res, utils, $) {
    return {
        importScript: function(url) {
            var u = url; //TODO map: res.resourceUrl(url);
            if (!u)
                return $.Deferred().resolve().promise();
            var df = $.Deferred();
            $.getScript(u, df.resolve).fail(function(e) {
                //TODO new mollify.ui.FullErrorView("Failed to load script ", "<code>" + u + "</code>").show();
                alert(u);
                df.reject();
            });
            return df.promise();
        },

        importCss: function(url) {
            var u = url; //TODO map: res.resourceUrl(url);
            if (!u) return;

            var link = $("<link>");
            link.attr({
                type: 'text/css',
                rel: 'stylesheet',
                href: utils.noncachedUrl(u)
            });
            $("head").append(link);
        }
    }
});

define('kloudspeaker/ui', ['jquery', 'durandal/composition', 'knockout'], function($, composition, ko) {
    return {
        dialogs: {
            open: function(s) {
                var api = $.Deferred();
                var modal = false;
                var spec = ({
                    titleKey: ko.observable(''),
                    buttons: ko.observableArray([])
                });

                var $e = $("<div/>").appendTo($("body"));
                composition.compose($e[0], {
                    activate: true,
                    activationData: {
                        $e: $e,
                        spec: s
                    },
                    model: {
                        activate: function(d) {
                            console.log("modal");
                            setTimeout(function() {
                                modal = $e.find(".modal").modal({
                                    show: true
                                }).on('hidden.bs.modal', function(e) {
                                    $e.remove();
                                    modal = false;
                                });
                            }, 0);
                        },
                        module: s.module,
                        view: s.view,
                        spec: spec,
                        close: function() {
                            api.reject();
                        },
                        ctx: {
                            param: s.param,
                            initModal: function(p) {
                                console.log(p);
                                spec.titleKey(p.titleKey || 'dialogs.defaultTitle');
                                spec.buttons(p.buttons || {
                                    titleKey: 'dialog.cancel',
                                    close: true
                                });
                            },
                            done: function(o) {
                                api.resolve(o);
                            },
                            cancel: function() {
                                api.reject();
                            }
                        }
                    },
                    view: "views/core/modal"
                });
                api.cancel = function() {
                    modal.modal('hide');
                };
                api.close = api.cancel;
                api.done(function() {
                    api.close();
                });
                api.fail(function() {
                    api.close();
                });
                return api;
            }
        }
    }
});

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
                    hi.active = false;
                    r.push(hi);
                });
                return r;
            }
        }
    }
});

define('kloudspeaker/ui/formatters', ['kloudspeaker/utils', "i18next", "moment"], function(utils, i18n, moment) {
    var formatters = {
        timestamp: function(ts, ctx) {
            if (ts == null) return "";
            var fmt = null;
            if (ctx && ctx.format) fmt = ctx.format;
            else fmt = i18n.t('formats.datetime.short');

            if (typeof(ts) === 'string') ts = utils.parseInternalTime(ts);
            return moment(ts).format(fmt);
        }
    };
    return {
        all: formatters,
        register: function(id, f) {
            formatters[id] = f;
        }
    }
});

// 1. require any modules that needs to be initialized at start
// 2. setup components etc

define([
    "kloudspeaker/core",
    "kloudspeaker/ui/formatters",
    "kloudspeaker/resources",
    "kloudspeaker/features",
    "durandal/composition",
    "plugins/widget",
    "knockout",
    "jquery",
    "i18next",
    "bootstrap",
    //"knockout-bootstrap",
    "knockstrap",
    "underscore"
], function(core, formatters, res, features, composition, widget, ko, $, i18n) {
    var _i18n = function(e, va) {
        var v = va();
        var value = ko.unwrap(v);
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

    //register widgets
    widget.registerKind('inplace-editor');
    widget.registerKind('config-list');
});

if (!window.isArray)
    window.isArray = function(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    }

if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    }
}

if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(s) {
        if (!s || s.length === 0) return false;
        return this.substring(0, s.length) == s;
    }
}

if (typeof String.prototype.count !== 'function') {
    String.prototype.count = function(search) {
        var m = this.match(new RegExp(search.toString().replace(/(?=[.\\+*?\[\^\]$(){}\|])/g, "\\"), "g"));
        return m ? m.length : 0;
    }
}

if (!window.def)
    window.def = function(o) {
        return (typeof(o) != 'undefined');
    }

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj, start) {
        for (var i = (start || 0), j = this.length; i < j; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function(from, to) {
        if (typeof(to) == 'undefined' && typeof(from) == 'object')
            from = this.indexOf(from);
        if (from < 0) return;
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };
}

if (!window.strpos)
    window.strpos = function(haystack, needle, offset) {
        // Finds position of first occurrence of a string within another  
        // 
        // version: 1109.2015
        // discuss at: http://phpjs.org/functions/strpos
        // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   improved by: Onno Marsman    
        // +   bugfixed by: Daniel Esteban
        // +   improved by: Brett Zamir (http://brett-zamir.me)
        var i = (haystack + '').indexOf(needle, (offset || 0));
        return i === -1 ? false : i;
    }

/*define(['durandal/system', 'plugins/dialog', 'durandal/app', 'durandal/viewEngine', 'knockout'], function(system, dialog, app, viewEngine, ko) {
    dialog.addContext('bootstrapModal', {
        blockoutOpacity: .2,
        removeDelay: 300,
        addHost: function(theDialog) {
            var body = $('body');
            var host = $('<div class="modal fade" id="bootstrapModal" tabindex="-1" role="dialog" data-keyboard="false" aria-labelledby="bootstrapModal" aria-hidden="true"></div>')
                .appendTo(body);
            theDialog.host = host.get(0);
        },
        removeHost: function(theDialog) {
            $('#bootstrapModal').modal('hide');
            $('body').removeClass('modal-open');
        },
        attached: null,
        compositionComplete: function(child, parent, context) {
            var theDialog = dialog.getDialog(context.model);
            var options = {};
            options.show = true;
            $('#bootstrapModal').modal(options);
            $('#bootstrapModal').on('hidden.bs.modal', function(e) {
                theDialog.close();
                ko.removeNode(theDialog.host);
                $('.modal-backdrop').remove();
            });
        }
    });
    var bootstrapMarkup = [
        '<div data-view="plugins/messageBox" data-bind="css: getClass(), style: getStyle()">',
        '<div class="modal-content">',
        '<div class="modal-header">',
        '<h3 data-bind="html: title"></h3>',
        '</div>',
        '<div class="modal-body">',
        '<p class="message" data-bind="html: message"></p>',
        '</div>',
        '<div class="modal-footer">',
        '<!-- ko foreach: options -->',
        '<button data-bind="click: function () { $parent.selectOption($parent.getButtonValue($data)); }, text: $parent.getButtonText($data), css: $parent.getButtonClass($index)"></button>',
        '<!-- /ko -->',
        '<div style="clear:both;"></div>',
        '</div>',
        '</div>',
        '</div>'
    ].join('\n');
    var bootstrapModal = function() {};
    bootstrapModal.install = function() {
        app.showBootstrapDialog = function(obj, activationData) {
            return dialog.show(obj, activationData, 'bootstrapModal');
        };
        app.showBootstrapMessage = function(message, title, options, autoclose, settings) {
            return dialog.showBootstrapMessage(message, title, options, autoclose, settings);
        };

        dialog.showBootstrapDialog = function(obj, activationData) {
            return dialog.show(obj, activationData, 'bootstrapModal');
        }
        dialog.showBootstrapMessage = function(message, title, options, autoclose, settings) {
            if (system.isString(this.MessageBox)) {
                return dialog.show(this.MessageBox, [
                    message,
                    title || this.MessageBox.defaultTitle,
                    options || this.MessageBox.defaultOptions,
                    autoclose || false,
                    settings || {}
                ], 'bootstrapModal');
            }
            var bootstrapDefaults = {
                buttonClass: "btn btn-default",
                primaryButtonClass: "btn-primary autofocus",
                secondaryButtonClass: "",
                "class": "modal-dialog",
                style: null
            };
            this.MessageBox.prototype.getView = function() {
                return viewEngine.processMarkup(bootstrapMarkup);
            };
            var bootstrapSettings = $.extend(bootstrapDefaults, settings);
            return dialog.show(new dialog.MessageBox(message, title, options, autoclose, bootstrapSettings), {}, 'bootstrapModal');
        };
        dialog.MessageBox.prototype.compositionComplete = function(child, parent, context) {
            var theDialog = dialog.getDialog(context.model);
            var $child = $(child);
            if ($child.hasClass('autoclose') || context.model.autoclose) {
                $(theDialog.blockout).click(function() {
                    theDialog.close();
                });
            }
        };
    };
    return bootstrapModal;
});*/
