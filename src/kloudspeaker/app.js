define(['require', 'jquery', 'durandal/system', 'durandal/app', 'durandal/viewLocator', 'durandal/binder', 'i18next'], function(require, $, system, app, viewLocator, binder, i18n) {
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
        }
    };
    var kloudspeakerApp = {};

    kloudspeakerApp.init = function(cfg) {
        kloudspeakerApp.config = $.extend({}, _kloudspeakerDefaults, cfg);

        var i18NOptions = {
            detectFromHeaders: false,
            lng: kloudspeakerApp.config.language.default || window.navigator.userLanguage || window.navigator.language,
            fallbackLang: kloudspeakerApp.config.language.default,
            ns: 'app',
            resGetPath: 'localizations/__lng__/__ns__.json',
            useCookie: false
        };

        define("kloudspeaker/config", function() {
            return kloudspeakerApp.config;
        });

        system.debug(true);

        app.title = 'Kloudspeaker';

        app.configurePlugins({
            router: true,
            dialog: true
        });

        var loadModules = function(session) {
            console.log("Loading modules");
            console.log(session);
            var df = $.Deferred();
            //TODO
            //require(['../../workbench/kloudspeaker/comments/public/js/plugin'], function() {
            df.resolve();
            //});
            return df;
        };

        require(['plugins/router', 'kloudspeaker/platform'], function(router) {
            app.start().then(function() {
                viewLocator.useConvention(false, kloudspeakerApp.config['templates-path']);

                i18n.init(i18NOptions, function() {
                    //Call localization on view before binding...
                    binder.binding = function(obj, view) {
                        $(view).i18n();
                    };

                    // change language when session starts, and redirect to default view (?)
                    // TODO move to where?
                    app.on('session:start').then(function(session) {
                        var lang = (session.user ? session.user.lang : false) || kloudspeakerApp.config.language.default;
                        console.log("LANG=" + lang);
                        i18n.setLng(lang);

                        router.navigate("files");
                    });

                    require(['kloudspeaker/session'], function(session) {
                        session.init(kloudspeakerApp.config).then(function() {
                            loadModules(session).then(function() {
                                app.setRoot('viewmodels/shell', false, 'kloudspeaker');
                            });
                        });
                    });
                });
            });
        });
    };
    return kloudspeakerApp;
});
