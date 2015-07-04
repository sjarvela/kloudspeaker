define([], function() {
    //TODO remove global references

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

    kloudspeaker._time = new Date().getTime();
    kloudspeaker._hiddenInd = 0;
    kloudspeaker.settings = false;
    kloudspeaker.session = false;

    var app = {};
    app.init = function(s, p) {
        app._initDf = $.Deferred();
        window.Modernizr.testProp("touch");

        app._initialized = false;
        app._views = {};

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
            if (app._initDf.state() == "pending") app._initDf.reject();
        };

        //TODO tear down manual dependency load
        require(['knockout', 'text', 'durandal/system', 'durandal/viewlocator', 'durandal/composition', 'durandal/binder', 'durandal/plugins/widget', 'kloudspeaker/localization', 'kloudspeaker/ui', 'kloudspeaker/plugins', 'kloudspeaker/request', 'kloudspeaker/events', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/utils', 'kloudspeaker/templates', 'kloudspeaker/features', 'kloudspeaker/dom', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/parsers'], function(ko, txt, ds, vl, comp, binder, dw, loc, ui, plugins, request, events, service, filesystem, utils, templates, features, dom, controls) {
            app.baseUrl = request.getBaseUrl(window.location.href);
            app.pageUrl = request.getPageUrl(window.location.href);
            app.pageParams = request.getParams(window.location.href);
            app.mobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

            service.init(false, kloudspeaker.settings["service-param"]);

            events.addEventHandler(function(e) {
                if (e.type == 'session/start') {
                    app._onSessionStart(e.payload);
                } else if (e.type == 'session/end') {
                    kloudspeaker.session = {};
                    kloudspeaker.filesystem.init([]);
                    start();
                }
            });

            ui.initialize().done(function() {
                app.initModules();
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
                            plugins.register(p[i]);
                    }

                    plugins.initialize().done(function() {
                        app._initialized = true;
                        start();
                    }).fail(onError);
                });
            }).fail(onError);
        });

        if (kloudspeaker.settings["view-url"])
            window.onpopstate = function(event) {
                app.onRestoreState(document.location.href, event.state);
            };

        return app._initDf;
    };

    app.getElement = function() {
        return $("#" + kloudspeaker.settings["app-element-id"]);
    };

    app._onSessionStart = function(s) {
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
                kloudspeaker.ui.initializeLang().done(app._doStart).fail(onError);
            }).fail(onError);
        });
    };

    app._doStart = function() {
        if (app.activeView && app.activeView.destroy) app.activeView.destroy();
        app.activeView = false;
        app.activeViewId = null;
        app.openView(app.pageParams.v || "/files/");
    };

    app.openView = function(viewId) {
        var id = viewId.split("/");

        var onView = function(v) {
            if (app.activeView && app.activeView.destroy) app.activeView.destroy();

            if (v) {
                app.activeView = v;
                app.activeViewId = id[0];
            } else {
                if (!kloudspeaker.session.user) {
                    var LoginView = require('kloudspeaker/ui/views/login');
                    app.activeView = new LoginView();
                    app.activeViewId = "login";
                } else {
                    var MainView = require('kloudspeaker/ui/views/main');
                    app.activeView = new MainView();
                    app.activeViewId = "main";
                }
            }

            app.activeView.init(app.getElement(), id).done(function() {
                if (app._initDf.state() == "pending") app._initDf.resolve();
            });
        };

        if (id) {
            var custom = !!app._views[id[0]];
            var isActiveView = (custom && app.activeViewId == id[0]) || (!custom && app.activeViewId == "main");

            if (isActiveView) app.activeView.onRestoreView(id);
            else app._getView(id, onView);
        } else onView();
    };

    app.showFullView = function(view) {
        app._showView(false, view, function(v) {
            if (!v) return;

            app.activeView = v;
            app.activeView.init(app.getElement(), null).done(function() {
                if (app._initDf.state() == "pending") app._initDf.resolve();
            });
        });
    };

    app._showView = function(id, view, cb) {
        var vm = function(v) {
            kloudspeaker.ui.viewmodel(v.view, v.model, app.getElement().empty()).done(function(m) {
                app.activeView = m;
                if (id)
                    app.activeViewId = id[0];
                if (app._initDf.state() == "pending") app._initDf.resolve();
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

    app._getView = function(id, cb) {
        var h = app._views[id[0]];
        var view = false;
        if (!h) {
            cb(false);
            return;
        }
        if (typeof(h) == 'function') {
            view = h(id, app.pageParams);
        } else if (h.model) {
            view = h;
        } else if (h.getView) {
            view = h.getView(id, app.pageParams);
        }
        if (!view) {
            cb(false);
            return;
        }

        app._showView(id, view, cb);
    };

    app.onRestoreState = function(url, o) {
        if (!kloudspeaker.settings["view-url"]) return;

        // if no view active, app is not loaded -> don't restore
        if (!app.activeView) return;

        if (!o || !o.user_id || !kloudspeaker.session.user || kloudspeaker.session.user.id != o.user_id) return;

        //baseUrl = kloudspeaker.request.getBaseUrl(url);
        var params = kloudspeaker.request.getParams(url);
        if (!params.v || params.v.length < 1) return;
        app.openView(params.v);
    };

    app.storeView = function(viewId) {
        if (!kloudspeaker.settings["view-url"]) return;
        var obj = {
            user_id: kloudspeaker.session.user ? kloudspeaker.session.user.id : null
        };
        if (window.history && window.history.pushState) window.history.pushState(obj, "", "?v=" + viewId);
    };

    app.registerView = function(id, h) {
        app._views[id] = h;
    };

    app.openPage = function(pageUrl) {
        window.location = app.getPageUrl(pageUrl);
    };

    app.getPageUrl = function(pageUrl) {
        return app.pageUrl + "?v=" + pageUrl;
    };

    app.initModules = function() {
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

        define('kloudspeaker/app', [], app);
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
        //define('kloudspeaker/features', [], kloudspeaker.features);
        //define('kloudspeaker/dom', [], kloudspeaker.dom);
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
                return app.activeView;
            },
            getActiveMainView: function() {
                if (app.activeViewId != "main") return false;
                return app.activeView.getActiveView();
            },
            getActiveFileView: function() {
                var mv = this.getActiveMainView();
                if (!mv || mv.viewId != 'files') return false;
                return mv;
            },
            registerView: function(id, v) {
                app.registerView(id, v);
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

    return app;
});
