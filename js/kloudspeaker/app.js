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

    var createApp = function(settings, session, fs, service, events, request, ui, loc, plugins, utils) {
        var app = {
            _initDf: $.Deferred(),
            _initialized: false,
            _views: {}
        };

        app.init = function(p) {
            var onError = function() {
                //TODO rewrite
                new kloudspeaker.ui.FullErrorView('Failed to initialize Kloudspeaker').show();
                if (app._initDf.state() == "pending") app._initDf.reject();
            };

            //TODO move to request?
            app.baseUrl = request.getBaseUrl(window.location.href);
            app.pageUrl = request.getPageUrl(window.location.href);
            app.pageParams = request.getParams(window.location.href);
            app.mobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

            service.initialize(app.baseUrl);

            events.addEventHandler(function(e) {
                if (e.type == 'session/start') {
                    app._onSessionStart();
                } else if (e.type == 'session/end') {
                    // nothing to do, session will start unauthenticated
                }
            });

            ui.initialize().done(function() {
                app.initModules();
                var deps = ['kloudspeaker/ui/views/main', 'kloudspeaker/ui/views/login', 'kloudspeaker/plugins/core', 'kloudspeaker/plugins/permissions'];
                if (settings.modules.load) deps = deps.concat(settings.modules.load);

                // wait for modules initialization
                require(deps, function() {
                    //TODO show plugin registration deprecation warning?
                    if (p) {
                        for (var i = 0, j = p.length; i < j; i++)
                            plugins.register(p[i]);
                    }

                    plugins.initialize().done(function() {
                        app._initialized = true;
                        session.init();
                    }).fail(onError);
                });
            }).fail(onError);

            if (settings["view-url"])
                window.onpopstate = function(event) {
                    app.onRestoreState(document.location.href, event.state);
                };

            return app._initDf;
        };

        //TODO move to UI
        app.getElement = function() {
            return $("#" + settings["app-element-id"]);
        };

        app._onSessionStart = function() {
            var s = session.get();
            var lang = (s.user && s.user.lang) ? s.user.lang : (settings.language["default"] || 'en');

            var onError = function() {
                //TODO rewrite
                new kloudspeaker.ui.FullErrorView('Failed to initialize Kloudspeaker').show();
            };

            if (!app._modulesInitialized) {
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
                    plugins.load(s.plugins).done(function() {
                        loc.initialize(lang).done(app._doStart).fail(onError);
                    }).fail(onError);
                });
                app._modulesInitialized = true;
            } else {
                loc.initialize(lang).done(app._doStart).fail(onError);
            }
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
                    var s = session.get();
                    if (!s.user) {
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
                ui.viewmodel(v.view, v.model, app.getElement().empty()).done(function(m) {
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
            if (!settings["view-url"]) return;

            // if no view active, app is not loaded -> don't restore
            if (!app.activeView) return;

            var s = session.get();
            if (!o || !o.user_id || !s.user || s.user.id != o.user_id) return;

            //baseUrl = kloudspeaker.request.getBaseUrl(url);
            var params = request.getParams(url);
            if (!params.v || params.v.length < 1) return;
            app.openView(params.v);
        };

        app.storeView = function(viewId) {
            if (!settings["view-url"]) return;
            var s = session.get();
            var obj = {
                user_id: session.user ? session.user.id : null
            };
            if (window.history && window.history.pushState) window.history.pushState(obj, "", "?v=" + viewId);
        };

        app.registerView = function(id, h) {
            app._views[id] = h;
        };

        app.openPage = function(p) {
            window.location = app.getPageUrl(p);
        };

        app.getPageUrl = function(p) {
            return app.pageUrl + "?v=" + p;
        };

        app.initModules = function() {
            var packages = [];
            if (settings.modules && settings.modules.paths) {
                _.each(utils.getKeys(settings.modules.paths), function(k) {
                    packages.push({
                        name: k,
                        location: settings.modules.paths[k]
                    });
                });
            }

            require.config({
                packages: packages
            });

            //TODO extract&rewrite into real modules

            //define('kloudspeaker/app', [], app);
            /*define('kloudspeaker/session', [], {
                get: function() {
                    return kloudspeaker.session;
                }
            });*/
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

            /*define('kloudspeaker/ui', [], {
                window: kloudspeaker.ui.window,
                download: kloudspeaker.ui.download,
                process: kloudspeaker.ui.process,
                handlers: kloudspeaker.ui.handlers,
                viewmodel: kloudspeaker.ui.viewmodel,
            });*/
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

            ui._configViews = {};
            ui._fileViewHandlers = [];
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
                    ui._configViews[v.id || v.viewId] = v;
                },
                registerFileViewHandler: function(h) {
                    ui._fileViewHandlers.push(h);
                }
            });
        };

        return app;
    };

    return {
        init: function(s, p) {
            var df = $.Deferred();
            var settings = $.extend(true, {}, kloudspeaker_defaults, s);
            // don't merge file list columns
            if (s["file-view"]["file-list-columns"]) settings["file-view"]["file-list-columns"] = s["file-view"]["file-list-columns"];
            define('kloudspeaker/settings', [], settings);
            kloudspeaker.settings = settings; //TODO remove

            require(['kloudspeaker/platform', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/request', 'kloudspeaker/ui', 'kloudspeaker/localization', 'kloudspeaker/plugins', 'kloudspeaker/permissions', 'kloudspeaker/utils'], function(platform, session, fs, service, events, request, ui, loc, plugins, permissions, utils) {
                var app = createApp(settings, session, fs, service, events, request, ui, loc, plugins, utils);
                define('kloudspeaker/instance', [], app);
                kloudspeaker.App = app; //TODO remove

                require(['kloudspeaker/instance', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/controls'], function(appInstance, dialogs, controls) {
                    //TODO are these all needed?
                    platform.setup();
                    service.setup();
                    loc.setup();
                    plugins.setup();
                    permissions.setup();
                    fs.setup();
                    controls.setup();
                    dialogs.setup();
                    ui.setup();

                    require(['kloudspeaker/templates', 'kloudspeaker/features', 'kloudspeaker/dom'], function(templates, features, dom) {
                        dom.setup();

                        kloudspeaker.helpers = utils; //remove when global "kloudspeaker" not needed
                        kloudspeaker.ui = ui; //remove when global "kloudspeaker" not needed
                        kloudspeaker.plugins = plugins; //remove when global "kloudspeaker" not needed
                        kloudspeaker.request = request; //remove when global "kloudspeaker" not needed
                        kloudspeaker.events = events; //remove when global "kloudspeaker" not needed
                        kloudspeaker.service = service; //remove when global "kloudspeaker" not needed
                        kloudspeaker.filesystem = fs; //remove when global "kloudspeaker" not needed
                        kloudspeaker.templates = templates; //remove when global "kloudspeaker" not needed
                        kloudspeaker.features = features; //remove when global "kloudspeaker" not needed
                        kloudspeaker.dom = dom; //remove when global "kloudspeaker" not needed

                        app.init(p).done(df.resolve).fail(df.reject);
                    });
                });
            });

            return df;
        }
    };
});
