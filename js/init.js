/**
 * init.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

var kloudspeaker_defaults = {
    "version-check-url": "http://www.kloudspeaker.com/version.php",
    "modules": false,
    "language": {
        "default": "en",
        "options": ["en"]
    },
    "view-url": true,
    "app-element-id": "kloudspeaker",
    "service-path": "backend/",
    "service-param": false,
    "file-view": {
        "create-empty-file-action": false,
        "default-view-mode": false,
        "list-view-columns": {
            "name": {
                width: 250
            },
            "size": {},
            "file-modified": {
                width: 150
            }
        },
        "actions": false
    },
    "html5-uploader": {
        maxChunkSize: 0
    },
    dnd: {
        dragimages: {
            "filesystemitem-file": "css/images/mimetypes64/empty.png",
            "filesystemitem-folder": "css/images/mimetypes64/folder.png",
            "filesystemitem-many": "css/images/mimetypes64/application_x_cpio.png"
        }
    }
};

! function($) {

    "use strict";

    var kloudspeaker = {
        App: {},
        view: {},
        ui: {},
        events: {},
        service: {},
        filesystem: {},
        plugins: {},
        features: {},
        dom: {},
        templates: {}
    };

    kloudspeaker._time = new Date().getTime();
    kloudspeaker._hiddenInd = 0;
    kloudspeaker.settings = false;
    kloudspeaker.session = false;

    /* APP */

    kloudspeaker.App.init = function(s, p) {
        kloudspeaker.App._initDf = $.Deferred();
        window.Modernizr.testProp("touch");

        kloudspeaker.App._initialized = false;
        kloudspeaker.App._views = {};

        kloudspeaker.settings = $.extend(true, {}, kloudspeaker_defaults, s);
        // don't merge file list columns
        if (s["file-view"]["file-list-columns"]) kloudspeaker.settings["file-view"]["file-list-columns"] = s["file-view"]["file-list-columns"];

        var start = function() {
            kloudspeaker.service.get("session/info/").fail(function() {
                new kloudspeaker.ui.FullErrorView('Failed to initialize Kloudspeaker').show();
            }).done(function(s) {
                kloudspeaker.events.dispatch('session/start', s);
            });
        };

        var onError = function() {
            new kloudspeaker.ui.FullErrorView('Failed to initialize Kloudspeaker').show();
            if (kloudspeaker.App._initDf.state() == "pending") kloudspeaker.App._initDf.reject();
        };

        //TODO tear down manual dependency load
        require(['knockout', 'text', 'durandal/system', 'durandal/viewlocator', 'durandal/composition', 'durandal/binder', 'durandal/plugins/widget', 'kloudspeaker/localization', 'kloudspeaker/plugins', 'kloudspeaker/request', 'kloudspeaker/events', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/utils', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/parsers'], function(ko, txt, ds, vl, comp, binder, dw, loc, plugins, request, events, service, filesystem, utils, controls) {
            kloudspeaker.helpers = utils; //remove when global "kloudspeaker" not needed
            kloudspeaker.plugins = plugins; //remove when global "kloudspeaker" not needed
            kloudspeaker.request = request; //remove when global "kloudspeaker" not needed
            kloudspeaker.events = events; //remove when global "kloudspeaker" not needed
            kloudspeaker.service = service; //remove when global "kloudspeaker" not needed
            kloudspeaker.filesystem = filesystem; //remove when global "kloudspeaker" not needed

            kloudspeaker.App.baseUrl = request.getBaseUrl(window.location.href);
            kloudspeaker.App.pageUrl = request.getPageUrl(window.location.href);
            kloudspeaker.App.pageParams = request.getParams(window.location.href);
            kloudspeaker.App.mobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

            service.init(false, kloudspeaker.settings["service-param"]);

            events.addEventHandler(function(e) {
                if (e.type == 'session/start') {
                    kloudspeaker.App._onSessionStart(e.payload);
                } else if (e.type == 'session/end') {
                    kloudspeaker.session = {};
                    kloudspeaker.filesystem.init([]);
                    start();
                }
            });

            kloudspeaker.ui.initialize().done(function() {
                kloudspeaker.App.initModules();
                var deps = ['kloudspeaker/app', 'kloudspeaker/ui/uploader', 'kloudspeaker/ui/clipboard', 'kloudspeaker/ui/dnd', 'kloudspeaker/ui/views/main', 'kloudspeaker/ui/views/login', 'kloudspeaker/plugins/core', 'kloudspeaker/plugins/permissions'];
                if (kloudspeaker.settings.modules.load) deps = deps.concat(kloudspeaker.settings.modules.load);

                // wait for modules initialization
                require(deps, function(uploader, clipboard) {
                    ds.debug(!!kloudspeaker.settings.debug); //TODO remove
                    kloudspeaker.ui._composition = comp;

                    //install durandal widget plugin
                    dw.install({});
                    dw.registerKind('time-picker');
                    dw.registerKind('config-list');

                    //configure knockout validation
                    ko.validation.init({
                        insertMessages: false,
                        decorateInputElement: true,
                        errorElementClass: 'error',
                        errorMessageClass: 'help-inline',
                        parseInputAttributes: true,
                        //decorateElementOnModified: false,
                    });
                    ko.validation.rules.areSame = {
                        getValue: function(o) {
                            return (typeof o === 'function' ? o() : o);
                        },
                        validator: function(val, otherField) {
                            var ov = this.getValue(otherField);
                            return val === ov;
                        },
                        message: 'The fields must have the same value'
                    };
                    ko.validation.registerExtenders();

                    // knockout
                    ko.bindingHandlers.enterkey = {
                        init: function(element, valueAccessor, allBindings, viewModel) {
                            var callback = valueAccessor();
                            $(element).keypress(function(event) {
                                var keyCode = (event.which ? event.which : event.keyCode);
                                if (keyCode === 13) {
                                    callback.call(viewModel);
                                    return false;
                                }
                                return true;
                            });
                        }
                    };

                    // format
                    var _format = function(e, va, ab, vm, bc) {
                        var $e = $(e);
                        var v = va();
                        var value = ko.unwrap(v);
                        var formatter = ab.get('formatter');
                        var val = '';
                        if (formatter) {
                            if (typeof(formatter) === 'function') val = formatter(value);
                            else val = formatter.format(value);
                        } else {
                            if (value)
                                val = '' + value;
                        }

                        var target = $e.attr('data-format-target');
                        if (!target || target == 'text')
                            $e.text(val);
                        else if (target == 'value')
                            $e.val(val);
                    };
                    comp.addBindingHandler('format', {
                        //init: _format,
                        update: _format
                    });

                    // i18n
                    var _i18n = function(e, va) {
                        var v = va();
                        var value = ko.unwrap(v);
                        var loc = kloudspeaker.ui.texts.get(value) || '';
                        var $e = $(e);
                        var target = $e.attr('data-i18n-bind-target');
                        if (target && target != 'text')
                            $e.attr(target, loc);
                        else
                            $e.text(loc);
                    };
                    comp.addBindingHandler('i18n', {
                        //init: _i18n,
                        update: _i18n
                    });

                    var _uploader = function(e, va) {
                        var v = va();
                        var value = ko.unwrap(v);
                        var $e = $(e);
                        var spec = {
                            url: value.url
                        };
                        if (value.dropTargetId) spec.dropElement = $("#" + value.dropTargetId);
                        if (value.handler) spec.handler = value.handler;
                        uploader.initUploadWidget($e, spec);
                    }
                    comp.addBindingHandler('uploader', {
                        //init: _i18n,
                        update: _uploader
                    });

                    comp.addBindingHandler('dom-effect', {
                        init: function(e, va) {
                            var v = va();
                            var value = ko.unwrap(v);
                            var $e = $(e);
                            if (value == 'hover') {
                                $e.hover(function() {
                                    $e.addClass("hover");
                                }, function() {
                                    $e.removeClass("hover");
                                });
                            }
                        }
                    });

                    comp.addBindingHandler('clipboard', {
                        update: function(e, va) {
                            var v = va();
                            var value = ko.unwrap(v);
                            var $e = $(e);

                            if (!clipboard.isInitialized()) {
                                $e.addClass("no-clipboard");
                                return;
                            } else {
                                clipboard.enableCopy($e, (typeof(value.data) === 'function' ? value.data() : value.data), {
                                    onMouseOver: function($e, clip) {
                                        if (value.hand) clip.setHandCursor(true);
                                        if (value.hover) $e.addClass("hover");
                                    },
                                    onMouseOut: function($e) {
                                        if (value.hover) $e.removeClass("hover");
                                    }
                                });
                            }
                        }
                    });

                    binder.binding = function(obj, view) {
                        $(view).find("[data-i18n]").each(function() {
                            var $t = $(this);
                            var key = $t.attr("data-i18n");
                            var attr = false;
                            if (key.indexOf('[') === 0) {
                                var parts = key.split(']');
                                key = parts[1];
                                attr = parts[0].substr(1, parts[0].length - 1);
                            }
                            if (!attr) $t.text(kloudspeaker.ui.texts.get(key));
                            else $t.attr(attr, kloudspeaker.ui.texts.get(key));
                        });
                    };

                    var modulesPath = 'viewmodels';
                    vl.useConvention(modulesPath, kloudspeaker.settings['templates-path']);
                    var reg = new RegExp(escape(modulesPath), 'gi');
                    vl.convertModuleIdToViewId = function(moduleId) {
                        //var path = moduleId.replace(reg, viewsPath);
                        var path = moduleId;
                        if (moduleId.startsWith('viewmodels/'))
                            path = viewsPath + moduleId.substring(11);
                        else {
                            _.each(packages, function(p) {
                                var pn = p.name + '/';
                                if (moduleId.startsWith(pn)) {
                                    path = p.location + "/views/" + moduleId.substring(pn.length);
                                    return false;
                                }
                            });
                        }
                        //TODO map
                        console.log("Resolve view:" + moduleId + " -> " + path);
                        return path;
                    };

                    //TODO show plugin registration deprecation warning?
                    if (p) {
                        for (var i = 0, j = p.length; i < j; i++)
                            kloudspeaker.plugins.register(p[i]);
                    }

                    kloudspeaker.plugins.initialize().done(function() {
                        kloudspeaker.App._initialized = true;
                        start();
                    }).fail(onError);
                });
            }).fail(onError);
        });

        if (kloudspeaker.settings["view-url"])
            window.onpopstate = function(event) {
                kloudspeaker.App.onRestoreState(document.location.href, event.state);
            };

        return kloudspeaker.App._initDf;
    };

    kloudspeaker.App.getElement = function() {
        return $("#" + kloudspeaker.settings["app-element-id"]);
    };

    kloudspeaker.App._onSessionStart = function(s) {
        var user = s.authenticated ? {
            id: s.user_id,
            name: s.username,
            type: s.user_type,
            lang: s.lang,
            admin: s.user_type == 'a',
            permissions: s.permissions,
            auth: s.user_auth,
            hasPermission: function(name, required) {
                return kloudspeaker.helpers.hasPermission(s.permissions, name, required);
            }
        } : null;

        kloudspeaker.session = {
            id: s.session_id,
            user: user,
            features: s.features,
            plugins: s.plugins,
            data: s,
            version: s.version,
            revision: s.revision
        };

        var onError = function() {
            new kloudspeaker.ui.FullErrorView('Failed to initialize Kloudspeaker').show();
        };

        kloudspeaker.service.init(s.features.limited_http_methods);

        var modules = [];
        var packages = [];
        _.each(s.plugins, function(pl) {
            if (pl.client_module_path) {
                modules.push(pl.client_module_id);
                packages.push({
                    name: pl.client_module_id,
                    location: pl.client_module_path
                });
            }
        });
        var df = $.Deferred();
        if (modules.length > 0) {
            requirejs.config({
                packages: packages
            });
            require(modules, function() {
                df.resolve();
            });
        } else
            df.resolve();

        df.done(function() {
            kloudspeaker.plugins.load(s.plugins).done(function() {
                kloudspeaker.filesystem.init(kloudspeaker.session.data.folders, ((kloudspeaker.session.user && kloudspeaker.session.user.admin) ? kloudspeaker.session.data.roots : false));
                kloudspeaker.ui.initializeLang().done(kloudspeaker.App._doStart).fail(onError);
            }).fail(onError);
        });
    };

    kloudspeaker.App._doStart = function() {
        if (kloudspeaker.App.activeView && kloudspeaker.App.activeView.destroy) kloudspeaker.App.activeView.destroy();
        kloudspeaker.App.activeView = false;
        kloudspeaker.App.activeViewId = null;
        kloudspeaker.App.openView(kloudspeaker.App.pageParams.v || "/files/");
    };

    kloudspeaker.App.openView = function(viewId) {
        var id = viewId.split("/");

        var onView = function(v) {
            if (kloudspeaker.App.activeView && kloudspeaker.App.activeView.destroy) kloudspeaker.App.activeView.destroy();

            if (v) {
                kloudspeaker.App.activeView = v;
                kloudspeaker.App.activeViewId = id[0];
            } else {
                if (!kloudspeaker.session.user) {
                    var LoginView = require('kloudspeaker/ui/views/login');
                    kloudspeaker.App.activeView = new LoginView();
                    kloudspeaker.App.activeViewId = "login";
                } else {
                    var MainView = require('kloudspeaker/ui/views/main');
                    kloudspeaker.App.activeView = new MainView();
                    kloudspeaker.App.activeViewId = "main";
                }
            }

            kloudspeaker.App.activeView.init(kloudspeaker.App.getElement(), id).done(function() {
                if (kloudspeaker.App._initDf.state() == "pending") kloudspeaker.App._initDf.resolve();
            });
        };

        if (id) {
            var custom = !!kloudspeaker.App._views[id[0]];
            var isActiveView = (custom && kloudspeaker.App.activeViewId == id[0]) || (!custom && kloudspeaker.App.activeViewId == "main");

            if (isActiveView) kloudspeaker.App.activeView.onRestoreView(id);
            else kloudspeaker.App._getView(id, onView);
        } else onView();
    };

    kloudspeaker.App.showFullView = function(view) {
        kloudspeaker.App._showView(false, view, function(v) {
            if (!v) return;

            kloudspeaker.App.activeView = v;
            kloudspeaker.App.activeView.init(kloudspeaker.App.getElement(), null).done(function() {
                if (kloudspeaker.App._initDf.state() == "pending") kloudspeaker.App._initDf.resolve();
            });
        });
    };

    kloudspeaker.App._showView = function(id, view, cb) {
        var vm = function(v) {
            kloudspeaker.ui.viewmodel(v.view, v.model, kloudspeaker.App.getElement().empty()).done(function(m) {
                kloudspeaker.App.activeView = m;
                if (id)
                    kloudspeaker.App.activeViewId = id[0];
                if (kloudspeaker.App._initDf.state() == "pending") kloudspeaker.App._initDf.resolve();
            });
        }

        if (view.model) {
            vm(view);
        } else if (view.done) {
            view.done(function(v) {
                if (!v)
                    cb(false);
                else if (v.model)
                    vm(v);
                else
                    cb(v);
            }).fail(function() {
                cb(false);
            });
        } else cb(view);
    }

    kloudspeaker.App._getView = function(id, cb) {
        var h = kloudspeaker.App._views[id[0]];
        var view = false;
        if (!h) {
            cb(false);
            return;
        }
        if (typeof(h) == 'function') {
            view = h(id, kloudspeaker.App.pageParams);
        } else if (h.model) {
            view = h;
        } else if (h.getView) {
            view = h.getView(id, kloudspeaker.App.pageParams);
        }
        if (!view) {
            cb(false);
            return;
        }

        kloudspeaker.App._showView(id, view, cb);
    };

    kloudspeaker.App.onRestoreState = function(url, o) {
        if (!kloudspeaker.settings["view-url"]) return;

        // if no view active, app is not loaded -> don't restore
        if (!kloudspeaker.App.activeView) return;

        if (!o || !o.user_id || !kloudspeaker.session.user || kloudspeaker.session.user.id != o.user_id) return;

        //baseUrl = kloudspeaker.request.getBaseUrl(url);
        var params = kloudspeaker.request.getParams(url);
        if (!params.v || params.v.length < 1) return;
        kloudspeaker.App.openView(params.v);
    };

    kloudspeaker.App.storeView = function(viewId) {
        if (!kloudspeaker.settings["view-url"]) return;
        var obj = {
            user_id: kloudspeaker.session.user ? kloudspeaker.session.user.id : null
        };
        if (window.history && window.history.pushState) window.history.pushState(obj, "", "?v=" + viewId);
    };

    kloudspeaker.App.registerView = function(id, h) {
        kloudspeaker.App._views[id] = h;
    };

    kloudspeaker.App.openPage = function(pageUrl) {
        window.location = kloudspeaker.App.getPageUrl(pageUrl);
    };

    kloudspeaker.App.getPageUrl = function(pageUrl) {
        return kloudspeaker.App.pageUrl + "?v=" + pageUrl;
    };

    kloudspeaker.App.initModules = function() {
        var packages = [];
        if (kloudspeaker.settings.modules && kloudspeaker.settings.modules.paths) {
            _.each(kloudspeaker.helpers.getKeys(kloudspeaker.settings.modules.paths), function(k) {
                packages.push({
                    name: k,
                    location: kloudspeaker.settings.modules.paths[k]
                });
            });
        }

        require.config({
            packages: packages
        });

        //TODO extract&rewrite into real modules

        define('kloudspeaker/app', [], kloudspeaker.App);
        define('kloudspeaker/settings', [], kloudspeaker.settings);
        define('kloudspeaker/session', [], {
            get: function() {
                return kloudspeaker.session;
            }
        });
        //define('kloudspeaker/filesystem', [], kloudspeaker.filesystem);
        //define('kloudspeaker/events', [], kloudspeaker.events);
        //define('kloudspeaker/request', [], kloudspeaker.request);
        //define('kloudspeaker/service', [], kloudspeaker.service);
        //define('kloudspeaker/plugins', [], kloudspeaker.plugins);
        define('kloudspeaker/features', [], kloudspeaker.features);
        define('kloudspeaker/dom', [], kloudspeaker.dom);
        //define('kloudspeaker/utils', [], kloudspeaker.helpers);
        kloudspeaker.helpers.Base64 = window.Base64;
        define('kloudspeaker/ui/texts', [], require("kloudspeaker/localization"));
        //define('kloudspeaker/ui/formatters', [], kloudspeaker.ui.formatters);
        //define('kloudspeaker/ui/controls', [], kloudspeaker.ui.controls);
        //define('kloudspeaker/ui/dialogs', [], kloudspeaker.ui.dialogs);

        define('kloudspeaker/ui', [], {
            window: kloudspeaker.ui.window,
            download: kloudspeaker.ui.download,
            process: kloudspeaker.ui.process,
            handlers: kloudspeaker.ui.handlers,
            viewmodel: kloudspeaker.ui.viewmodel,
        });
        //define('kloudspeaker/ui/dnd', [], kloudspeaker.ui.draganddrop);
        //define('kloudspeaker/ui/uploader', [], kloudspeaker.ui.uploader);
        /*define('kloudspeaker/ui/clipboard', [], function() {
            return kloudspeaker.ui.clipboard;
        });*/
        /*define('kloudspeaker/localization', [], function() {
            return {
                registerPluginResource: function(pluginId) {
                    //TODO refactor localization into separate module
                    //use require.js to load resources, can be optimized
                    //into package
                    kloudspeaker.ui.texts.loadPlugin(pluginId);
                }
            }
        });*/

        kloudspeaker.ui._configViews = {};
        kloudspeaker.ui._fileViewHandlers = [];
        define('kloudspeaker/ui/views', [], {
            getActiveView: function() {
                return kloudspeaker.App.activeView;
            },
            getActiveMainView: function() {
                if (kloudspeaker.App.activeViewId != "main") return false;
                return kloudspeaker.App.activeView.getActiveView();
            },
            getActiveFileView: function() {
                var mv = this.getActiveMainView();
                if (!mv || mv.viewId != 'files') return false;
                return mv;
            },
            registerView: function(id, v) {
                kloudspeaker.App.registerView(id, v);
            },
            registerConfigView: function(v) {
                kloudspeaker.ui._configViews[v.id || v.viewId] = v;
            },
            registerFileViewHandler: function(h) {
                kloudspeaker.ui._fileViewHandlers.push(h);
            }
        });
    };

    kloudspeaker.getItemDownloadInfo = function(i) {
        if (!i) return false;
        var single = false;

        if (!window.isArray(i)) single = i;
        else if (i.length === 0) single = i[0];

        if (single && single.is_file) {
            return {
                name: single.name,
                url: kloudspeaker.filesystem.getDownloadUrl(single)
            };
        } else {
            if (!single) return false;

            if (kloudspeaker.plugins.exists("plugin-archiver")) return {
                name: single.name + ".zip", //TODO get extension from plugin
                url: kloudspeaker.plugins.get("plugin-archiver").getDownloadCompressedUrl(i)
            };
        }

        return false;
    };

    kloudspeaker.resourceUrl = function(u) {
        if (!kloudspeaker.settings["resource-map"]) return u;

        var urlParts = kloudspeaker.helpers.breakUrl(u);
        if (!urlParts) return u;

        var mapped = kloudspeaker.settings["resource-map"][urlParts.path];
        if (mapped === undefined) return u;
        if (mapped === false) return false;

        return mapped + urlParts.paramsString;
    };

    /* FEATURES */

    var ft = kloudspeaker.features;
    ft.hasFeature = function(id) {
        return kloudspeaker.session.features && kloudspeaker.session.features[id];
    };

    /* TEMPLATES */
    var mt = kloudspeaker.templates;
    mt._loaded = [];

    mt.url = function(name) {
        var base = kloudspeaker.settings["template-url"] || 'templates/';
        return kloudspeaker.helpers.noncachedUrl(kloudspeaker.resourceUrl(base + name));
    };

    mt.load = function(name, url) {
        var df = $.Deferred();
        if (mt._loaded.indexOf(name) >= 0) {
            return df.resolve();
        }

        $.get(url ? kloudspeaker.resourceUrl(url) : mt.url(name)).done(function(h) {
            mt._loaded.push(name);
            $("body").append(h);
            df.resolve();
        }).fail(function(f) {
            df.reject();
        });
        return df;
    };

    /* DOM */
    var md = kloudspeaker.dom;
    md._hiddenLoaded = [];

    md.importScript = function(url) {
        var u = kloudspeaker.resourceUrl(url);
        if (!u)
            return $.Deferred().resolve().promise();
        var df = $.Deferred();
        $.getScript(u, df.resolve).fail(function(e) {
            new kloudspeaker.ui.FullErrorView("Failed to load script ", "<code>" + u + "</code>").show();
        });
        return df.promise();
    };

    md.importCss = function(url) {
        var u = kloudspeaker.resourceUrl(url);
        if (!u) return;

        var link = $("<link>");
        link.attr({
            type: 'text/css',
            rel: 'stylesheet',
            href: kloudspeaker.helpers.noncachedUrl(u)
        });
        $("head").append(link);
    };

    md.loadContent = function(contentId, url, cb) {
        if (md._hiddenLoaded.indexOf(contentId) >= 0) {
            if (cb) cb();
            return;
        }
        var u = kloudspeaker.resourceUrl(url);
        if (!u) {
            if (cb) cb();
            return;
        }
        var id = 'kloudspeaker-tmp-' + (kloudspeaker._hiddenInd++);
        $('<div id="' + id + '" style="display:none"/>').appendTo($("body")).load(kloudspeaker.helpers.noncachedUrl(u), function() {
            md._hiddenLoaded.push(contentId);
            if (cb) cb();
        });
    };

    md.loadContentInto = function($target, url, handler, process) {
        var u = kloudspeaker.resourceUrl(url);
        if (!u) return $.Deferred().resolve().promise();

        var df = $.Deferred();
        $target.load(kloudspeaker.helpers.noncachedUrl(u), function() {
            if (process) kloudspeaker.ui.process($target, process, handler);
            if (typeof handler === 'function') handler();
            else if (handler.onLoad) handler.onLoad($target);
            df.resolve();
        });
        return df;
    };

    md.template = function(id, data, opt) {
        var templateId = id;
        if (templateId.startsWith("#")) templateId = templateId.substring(1);
        if (kloudspeaker.settings["resource-map"] && kloudspeaker.settings["resource-map"]["template:" + id])
            templateId = kloudspeaker.settings["resource-map"]["template:" + id];
        return $("#" + templateId).tmpl(data, opt);
    };

    md.bind = function(model, activationData, $e) {
        if (!$e || $e.length === 0) return;
        if (model.activate) model.activate(activationData);
        ko.applyBindings(model, $e[0]);
        kloudspeaker.ui.process($e, ['localize']);
        if (model.attached) model.attached($e);
    };

    window.kloudspeaker = kloudspeaker;

    /* Common */

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

    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function(s) {
            if (!s || s.length === 0) return false;
            return this.substring(s.length - 1, 1) == s;
        }
    }

    if (typeof String.prototype.count !== 'function') {
        String.prototype.count = function(search) {
            var m = this.match(new RegExp(search.toString().replace(/(?=[.\\+*?\[\^\]$(){}\|])/g, "\\"), "g"));
            return m ? m.length : 0;
        }
    }

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
            if (typeof(to) == 'undefined' && (typeof(from) == 'object' || typeof(from) == 'function'))
                from = this.indexOf(from);
            if (from < 0) return;
            var rest = this.slice((to || from) + 1 || this.length);
            this.length = from < 0 ? this.length + from : from;
            return this.push.apply(this, rest);
        };
    }

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

    var STR_PAD_LEFT = 1;
    var STR_PAD_RIGHT = 2;
    var STR_PAD_BOTH = 3;

    function pad(str, len, padstr, dir) {
        if (typeof(len) == "undefined") {
            len = 0;
        }
        if (typeof(padstr) == "undefined") {
            padstr = ' ';
        }
        if (typeof(dir) == "undefined") {
            dir = STR_PAD_RIGHT;
        }

        if (len + 1 >= str.length) {
            switch (dir) {
                case STR_PAD_LEFT:
                    str = new Array(len + 1 - str.length).join(padstr) + str;
                    break;
                case STR_PAD_BOTH:
                    var padlen = len - str.length;
                    var right = Math.ceil(padlen / 2);
                    var left = padlen - right;
                    str = new Array(left + 1).join(padstr) + str + new Array(right + 1).join(padstr);
                    break;
                default:
                    str = str + new Array(len + 1 - str.length).join(padstr);
                    break;
            }
        }
        return str;
    }

    /**
     *
     *  Base64 encode / decode
     *  http://www.webtoolkit.info/
     *
     **/

    window.Base64 = {

        // private property
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

        // public method for encoding
        encode: function(input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;

            input = window.Base64._utf8_encode(input);

            while (i < input.length) {

                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

            }

            return output;
        },

        // public method for decoding
        decode: function(input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            while (i < input.length) {

                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }

            }

            output = window.Base64._utf8_decode(output);

            return output;

        },

        // private method for UTF-8 encoding
        _utf8_encode: function(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        },

        // private method for UTF-8 decoding
        _utf8_decode: function(utftext) {
            var string = "";
            var i = 0;
            var c = 0,
                c1 = 0,
                c2 = 0;

            while (i < utftext.length) {

                c = utftext.charCodeAt(i);

                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    var c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

            }

            return string;
        }
    }
}(window.jQuery);
