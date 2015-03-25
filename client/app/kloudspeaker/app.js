define(['require', 'jquery', 'durandal/system', 'durandal/app', 'durandal/viewLocator', 'durandal/binder'], function(require, $, system, app, viewLocator, binder) {
    var _kloudspeakerDefaults = {
        "localization-debug": false,
        "language": {
            "default": "en",
            "options": ["en"]
        },
        "view-url": false,
        "app-element-id": "kloudspeaker",
        "rest-path": "backend/",
        "templates-path": "views/",
        "limited-http-methods": false,
        "file-view": {
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
            "actions": {
                "click": "view/details",
                "dbl-click": "filesystem/open",
                "right-click": "view/menu",
                "mouse-over": "quickactions"
            }
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
        },
        plugins: {
            "ItemDetails": {
                "*": {
                    "metadata/created": {},
                    "filesystem/last-modified": {},
                    "filesystem/size": {}
                }
            }
        }
    };
    var kloudspeakerApp = {};

    kloudspeakerApp.init = function(cfg) {
        kloudspeakerApp.config = $.extend({}, _kloudspeakerDefaults, cfg);

        define("kloudspeaker/config", function() {
            return kloudspeakerApp.config;
        });
        define("kloudspeaker/instance", function() {
            return kloudspeakerApp;
        });

        system.debug(true);

        app.title = 'Kloudspeaker';

        app.configurePlugins({
            widget: true,
            router: true,
            dialog: true
        });

        var loadModules = function(session) {
            console.log("Loading modules");
            console.log(session);
            var modules = [];
            var packages = [];
            _.each(session.plugins, function(pl) {
                if (pl["client_module_path"]) {
                    modules.push(pl["client_module_id"]);
                    packages.push({
                        name: pl["client_module_id"],
                        location: pl["client_module_path"]
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
            return df;
        };

        require(['plugins/router', 'kloudspeaker/platform'], function(router) {
            app.start().then(function() {
                require(['kloudspeaker/resources', 'kloudspeaker/localization'], function(res, loc) {
                    // customize view path
                    var modulesPath = 'viewmodels';
                    var viewsPath = kloudspeakerApp.config['templates-path'];
                    viewLocator.useConvention(modulesPath, kloudspeakerApp.config['templates-path']);
                    var reg = new RegExp(escape(modulesPath), 'gi');
                    viewLocator.convertModuleIdToViewId = function(moduleId) {
                        var path = moduleId.replace(reg, viewsPath);
                        //TODO map
                        console.log("Resolve view:" + moduleId + " -> " + path);
                        return path;
                    };

                    loc.init(function() {
                        //Call localization on view before binding...
                        binder.binding = function(obj, view) {
                            $(view).i18n();
                        };

                        // change language when session starts, and redirect to default view (?)
                        app.on('session:start').then(function(session) {
                            loc.setLang((session.user ? session.user.lang : false) || kloudspeakerApp.config.language.default);
                            router.navigate("files");
                        });

                        require(['kloudspeaker/session'], function(session) {
                            session.init(kloudspeakerApp.config).then(function(s) {
                                loadModules(s).then(function() {
                                    app.setRoot('viewmodels/shell', false, 'kloudspeaker');
                                });
                            });
                        });
                    });
                });
            });
        });
    };
    return kloudspeakerApp;
});
