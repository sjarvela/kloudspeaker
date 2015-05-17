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
        kloudspeaker.App.baseUrl = kloudspeaker.request.getBaseUrl(window.location.href);
        kloudspeaker.App.pageUrl = kloudspeaker.request.getPageUrl(window.location.href);
        kloudspeaker.App.pageParams = kloudspeaker.request.getParams(window.location.href);
        kloudspeaker.App.mobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

        kloudspeaker.settings = $.extend(true, {}, kloudspeaker_defaults, s);
        // don't merge file list columns
        if (s["file-view"]["file-list-columns"]) kloudspeaker.settings["file-view"]["file-list-columns"] = s["file-view"]["file-list-columns"];

        kloudspeaker.service.init(false, kloudspeaker.settings["service-param"]);

        kloudspeaker.plugins.register(new kloudspeaker.plugin.Core());
        kloudspeaker.plugins.register(new kloudspeaker.plugin.PermissionsPlugin());
        if (p) {
            for (var i = 0, j = p.length; i < j; i++)
                kloudspeaker.plugins.register(p[i]);
        }

        kloudspeaker.events.addEventHandler(function(e) {
            if (e.type == 'session/start') {
                kloudspeaker.App._onSessionStart(e.payload);
            } else if (e.type == 'session/end') {
                kloudspeaker.session = {};
                kloudspeaker.filesystem.init([]);
                start();
            }
        });

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

        kloudspeaker.ui.initialize().done(function() {
            kloudspeaker.App.initModules();
            var deps = ['durandal/system', 'durandal/viewlocator', 'durandal/composition',  'durandal/plugins/widget', 'kloudspeaker/app'];
            if (kloudspeaker.settings.modules.load) deps = deps.concat(kloudspeaker.settings.modules.load);

            // wait for modules initialization
            require(deps, function(ds, vl, comp, dw, app) {
                kloudspeaker.ui._composition = comp;

                //install durandal widget plugin
                dw.install({});
                dw.registerKind('time-picker');

                ds.debug(!!kloudspeaker.settings.debug); //TODO remove

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

                kloudspeaker.plugins.initialize().done(function() {
                    kloudspeaker.App._initialized = true;
                    start();
                }).fail(onError);
            });
        }).fail(onError);

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

        kloudspeaker.service.init(s.features['limited_http_methods']);

        var modules = [];
        var packages = [];
        _.each(s.plugins, function(pl) {
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

        df.done(function() {
            kloudspeaker.plugins.load(s.plugins).done(function() {
                kloudspeaker.filesystem.init(kloudspeaker.session.data.folders, ((kloudspeaker.session.user && kloudspeaker.session.user.admin) ? kloudspeaker.session.data.roots : false));
                kloudspeaker.ui.initializeLang().done(kloudspeaker.App._doStart).fail(onError);
            }).fail(onError);
        });
    };

    kloudspeaker.App._doStart = function() {
        kloudspeaker.App.activeView = false;
        kloudspeaker.App.activeViewId = null;
        kloudspeaker.App.openView(kloudspeaker.App.pageParams.v || "/files/");
    };

    kloudspeaker.App.openView = function(viewId) {
        var id = viewId.split("/");

        var onView = function(v) {
            if (v) {
                kloudspeaker.App.activeView = v;
                kloudspeaker.App.activeViewId = id[0];
            } else {
                if (!kloudspeaker.session.user) {
                    kloudspeaker.App.activeView = new kloudspeaker.view.LoginView();
                    kloudspeaker.App.activeViewId = "login";
                } else {
                    kloudspeaker.App.activeView = new kloudspeaker.view.MainView();
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

    kloudspeaker.App._getView = function(id, cb) {
        var h = kloudspeaker.App._views[id[0]];
        if (h && h.getView) {
            var view = h.getView(id, kloudspeaker.App.pageParams);
            if (view && view.done) view.done(cb);
            else cb(view);
        } else cb(false);
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
        if (window.history) window.history.pushState(obj, "", "?v=" + viewId);
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
        var packages = [{
            name: 'templates',
            location: '../templates'
        }];
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

        define('kloudspeaker/app', [], kloudspeaker.App);
        define('kloudspeaker/settings', [], kloudspeaker.settings);
        define('kloudspeaker/session', [], {
            get: function() {
                return kloudspeaker.session;
            }
        });
        define('kloudspeaker/filesystem', [], kloudspeaker.filesystem);
        define('kloudspeaker/events', [], kloudspeaker.events);
        define('kloudspeaker/request', [], kloudspeaker.request);
        define('kloudspeaker/service', [], kloudspeaker.service);
        define('kloudspeaker/plugins', [], kloudspeaker.plugins);
        define('kloudspeaker/features', [], kloudspeaker.features);
        define('kloudspeaker/dom', [], kloudspeaker.dom);
        define('kloudspeaker/utils', [], kloudspeaker.helpers);
        define('kloudspeaker/ui/texts', [], kloudspeaker.ui.texts);
        define('kloudspeaker/ui/formatters', [], kloudspeaker.ui.formatters);
        define('kloudspeaker/ui/controls', [], kloudspeaker.ui.controls);
        define('kloudspeaker/ui/dialogs', [], kloudspeaker.ui.dialogs);
        define('kloudspeaker/ui', [], {
            window: kloudspeaker.ui.window,
            process: kloudspeaker.ui.process,
            handlers: kloudspeaker.ui.handlers,
            viewmodel: kloudspeaker.ui.viewmodel,
        });
        define('kloudspeaker/ui/dnd', [], kloudspeaker.ui.draganddrop);
        define('kloudspeaker/ui/uploader', [], kloudspeaker.ui.uploader);
        define('kloudspeaker/ui/clipboard', [], kloudspeaker.ui.clipboard);

        kloudspeaker.ui._configViews = {};
        kloudspeaker.ui._fileViewHandlers = [];
        define('kloudspeaker/ui/views', [], {
            registerConfigView: function(v) {
                kloudspeaker.ui._configViews[v.id] = v;
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

    /* REQUEST */

    kloudspeaker.request = {
        getParam: function(name) {
            if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search))
                return decodeURIComponent(name[1]);
        },
        getParams: function() {
            return kloudspeaker.helpers.getUrlParams(location.search);
        },
        getBaseUrl: function(url) {
            var param = url.lastIndexOf('?');
            if (param >= 0) url = url.substring(0, param);

            var dash = url.lastIndexOf('/');
            return url.substring(0, dash + 1);
        },
        getPageUrl: function(url) {
            var param = url.lastIndexOf('?');
            if (param >= 0) url = url.substring(0, param);
            return url;
        }
    }

    /* EVENTS */
    var et = kloudspeaker.events;
    et._handlers = [];
    et._handlerTypes = {};

    et.addEventHandler = function(h, t) {
        et._handlers.push(h);
        if (t) et._handlerTypes[h] = t;
    };

    et.dispatch = function(type, payload) {
        var e = {
            type: type,
            payload: payload
        };
        $.each(et._handlers, function(i, h) {
            if (!et._handlerTypes[h] || type == et._handlerTypes[h])
                h(e);
        });
    };

    /* SERVICE */
    var st = kloudspeaker.service;

    st.init = function(limitedHttpMethods, serviceParam) {
        st._limitedHttpMethods = !!limitedHttpMethods;
        st._serviceParam = !!serviceParam;
    };

    st.url = function(u, full) {
        if (u.startsWith('http')) return u;
        var url = kloudspeaker.settings["service-path"] + "r.php";
        url = url + (st._serviceParam ? ("?sp=" + u) : ("/" + u));
        if (!full) return url;
        return kloudspeaker.App.baseUrl + url;
    };

    st.get = function(url) {
        return st._do("GET", url, null);
    };

    st.post = function(url, data) {
        return st._do("POST", url, data);
    };

    st.put = function(url, data) {
        return st._do("PUT", url, data);
    };

    st.del = function(url, data) {
        return st._do("DELETE", url, data);
    };

    st._do = function(type, url, data) {
        var t = type;
        var diffMethod = (st._limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
        if (diffMethod) t = 'POST';

        return (function(sid) {
            return $.ajax({
                type: t,
                url: st.url(url),
                processData: false,
                data: data ? JSON.stringify(data) : null,
                contentType: 'application/json',
                dataType: 'json',
                beforeSend: function(xhr) {
                    if (kloudspeaker.session && kloudspeaker.session.id)
                        xhr.setRequestHeader("kloudspeaker-session-id", kloudspeaker.session.id);
                    if (st._limitedHttpMethods || diffMethod)
                        xhr.setRequestHeader("kloudspeaker-http-method", type);
                }
            }).pipe(function(r) {
                if (!r) {
                    return $.Deferred().reject({
                        code: 999
                    });
                }
                return r.result;
            }, function(xhr) {
                var df = $.Deferred();

                // if session has expired since starting request, ignore it
                if (kloudspeaker.session.id != sid) return df;

                var error = false;
                var data = false;

                if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse($.trim(xhr.responseText));
                if (!error) error = {
                    code: 999
                }; //unknown

                var failContext = {
                    handled: false
                }
                if (error.code == 100 && kloudspeaker.session.user) {
                    kloudspeaker.events.dispatch('session/end');
                    failContext.handled = true;
                }
                // push default handler to end of callback list
                setTimeout(function() {
                    df.fail(function(err) {
                        if (failContext.handled) return;
                        // request denied
                        if (err.code == 109 && err.data && err.data.items) {
                            kloudspeaker.ui.actions.handleDenied(null, err.data, kloudspeaker.ui.texts.get('genericActionDeniedMsg'));
                        } else {
                            kloudspeaker.ui.dialogs.showError(err);
                        }
                    });
                }, 0);
                return df.rejectWith(failContext, [error]);
            }).promise()
        }(kloudspeaker.session.id));
    };

    /* FILESYSTEM */

    var mfs = kloudspeaker.filesystem;

    mfs.init = function(f, allRoots) {
        kloudspeaker.filesystem.permissionCache = {};
        kloudspeaker.filesystem.roots = [];
        kloudspeaker.filesystem.allRoots = false;
        kloudspeaker.filesystem.rootsById = {};
        kloudspeaker.filesystem.rootsByFolderId = {};

        mfs.updateRoots(f, allRoots);
    };

    mfs.updateRoots = function(f, allRoots) {
        if (f && kloudspeaker.session.user) {
            kloudspeaker.filesystem.roots = f.sort(function(a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            for (var i = 0, j = f.length; i < j; i++) {
                kloudspeaker.filesystem.rootsById[f[i].id] = f[i];
                kloudspeaker.filesystem.rootsByFolderId[f[i].folder_id] = f[i];
            }

            if (allRoots) {
                kloudspeaker.filesystem.allRoots = allRoots;
                for (var k = 0, l = allRoots.length; k < l; k++)
                    if (!kloudspeaker.filesystem.rootsById[allRoots[k].id]) {
                        kloudspeaker.filesystem.rootsById[allRoots[k].id] = allRoots[k];
                        kloudspeaker.filesystem.rootsById[allRoots[k].folder_id] = allRoots[k];
                    }
            }
        }
    };

    mfs.getDownloadUrl = function(item) {
        if (!item.is_file) return false;
        var url = kloudspeaker.service.url("filesystem/" + item.id, true);
        if (kloudspeaker.App.mobile)
            url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
        return url;
    };

    mfs.getUploadUrl = function(folder) {
        if (!folder || folder.is_file) return null;
        return kloudspeaker.service.url("filesystem/" + folder.id + '/files/') + "?format=binary";
    };

    mfs.itemDetails = function(item, data) {
        return kloudspeaker.service.post((item.detailsId ? (item.detailsId + "/details/") : ("filesystem/" + item.id + "/details/")), {
            data: data
        }).done(function(r) {
            if (r.permissions)
                kloudspeaker.filesystem.permissionCache[item.id] = r.permissions;
            if (item.parent_id && r.parent_permissions) kloudspeaker.filesystem.permissionCache[item.parent_id] = r.parent_permissions;
        });
    };

    mfs.folderInfo = function(id, hierarchy, data) {
        return kloudspeaker.service.post("filesystem/" + (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), {
            data: data
        }).done(function(r) {
            kloudspeaker.filesystem.permissionCache[id] = r.permissions;
        });
    };

    mfs.findFolder = function(d, data) {
        return kloudspeaker.service.post("filesystem/find/", {
            folder: d,
            data: data
        });
    };

    mfs.hasPermission = function(item, name, required) {
        if (!kloudspeaker.session.user) return false;
        if (kloudspeaker.session.user.admin) return true;
        return kloudspeaker.helpers.hasPermission(kloudspeaker.filesystem.permissionCache[((typeof(item) === "string") ? item : item.id)], name, required);
    };

    mfs.items = function(parent, files, allRoots) {
        if (parent == null) {
            var df = $.Deferred();
            df.resolve({
                folders: (allRoots && kloudspeaker.session.user.admin) ? mfs.allRoots : mfs.roots,
                files: []
            });
            return df.promise();
        }
        return kloudspeaker.service.get("filesystem/" + parent.id + "/items/?files=" + (files ? '1' : '0'));
    };

    mfs.createEmptyFile = function(parent, name) {
        return kloudspeaker.service.post("filesystem/" + parent.id + "/empty_file", {
            name: name
        }).done(function() {
            kloudspeaker.events.dispatch('filesystem/create_item', {
                parent: parent,
                name: name
            });
        });
    };

    mfs.copy = function(i, to) {
        if (!i) return;

        if (window.isArray(i) && i.length > 1) {
            if (!to) {
                var df = $.Deferred();
                kloudspeaker.ui.dialogs.folderSelector({
                    title: kloudspeaker.ui.texts.get('copyMultipleFileDialogTitle'),
                    message: kloudspeaker.ui.texts.get('copyMultipleFileMessage', [i.length]),
                    actionTitle: kloudspeaker.ui.texts.get('copyFileDialogAction'),
                    handler: {
                        onSelect: function(f) {
                            mfs._validated(mfs._copyMany, [i, f], "copy", kloudspeaker.ui.texts.get("actionDeniedCopyMany", i.length), kloudspeaker.ui.texts.get("actionAcceptCopyMany", i.length)).done(df.resolve).fail(df.reject);
                        },
                        canSelect: function(f) {
                            return mfs.canCopyTo(i, f);
                        }
                    }
                });
                return df.promise();
            } else
                return mfs._copyMany(i, to);

            return;
        }

        if (window.isArray(i)) i = i[0];

        if (!to) {
            var df2 = $.Deferred();
            kloudspeaker.ui.dialogs.folderSelector({
                title: kloudspeaker.ui.texts.get('copyFileDialogTitle'),
                message: kloudspeaker.ui.texts.get('copyFileMessage', [i.name]),
                actionTitle: kloudspeaker.ui.texts.get('copyFileDialogAction'),
                handler: {
                    onSelect: function(f) {
                        mfs._validated(mfs._copy, [i, f], "copy", kloudspeaker.ui.texts.get("actionDeniedCopy", i.name), kloudspeaker.ui.texts.get("actionAcceptCopy", i.name)).done(df2.resolve).fail(df2.reject);
                    },
                    canSelect: function(f) {
                        return mfs.canCopyTo(i, f);
                    }
                }
            });
            return df2.promise();
        } else
            return mfs._copy(i, to);
    };

    mfs.copyHere = function(item, name) {
        if (!item) return;

        if (!name) {
            var df = $.Deferred();
            kloudspeaker.ui.dialogs.input({
                title: kloudspeaker.ui.texts.get('copyHereDialogTitle'),
                message: kloudspeaker.ui.texts.get('copyHereDialogMessage'),
                defaultValue: item.name,
                yesTitle: kloudspeaker.ui.texts.get('copyFileDialogAction'),
                noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
                handler: {
                    isAcceptable: function(n) {
                        return !!n && n.length > 0 && n != item.name;
                    },
                    onInput: function(n) {
                        mfs._validated(mfs._copyHere, [item, n], "copy", kloudspeaker.ui.texts.get("actionDeniedCopy", item.name), kloudspeaker.ui.texts.get("actionAcceptCopy", item.name)).done(df.resolve).fail(df.reject);
                    }
                }
            });
            return df.promise();
        } else {
            return mfs._copyHere(item, name);
        }
    };

    mfs.canCopyTo = function(item, to) {
        if (window.isArray(item)) {
            for (var i = 0, j = item.length; i < j; i++)
                if (!mfs.canCopyTo(item[i], to)) return false;
            return true;
        }

        // cannot copy into file
        if (to.is_file) return false;

        // cannot copy into itself
        if (item.id == to.id) return false;

        // cannot copy into same location
        if (item.parent_id == to.id) return false;
        return true;
    };

    mfs.canMoveTo = function(item, to) {
        if (window.isArray(item)) {
            for (var i = 0, j = item.length; i < j; i++)
                if (!mfs.canMoveTo(item[i], to)) return false;
            return true;
        }

        // cannot move into file
        if (to.is_file) return false;

        // cannot move folder into its own subfolder
        if (!to.is_file && item.root_id == to.root_id && to.path.startsWith(item.path)) return false;

        // cannot move into itself
        if (item.id == to.id) return false;

        // cannot move into same location
        if (item.parent_id == to.id) return false;
        return true;
    };

    mfs._copyHere = function(i, name, acceptKeys) {
        return kloudspeaker.service.post("filesystem/" + i.id + "/copy/", {
            name: name,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/copy', {
                items: [i],
                name: name
            });
        });
    };

    mfs._copy = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        kloudspeaker.service.post("filesystem/" + i.id + "/copy/", {
            folder: to.id,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/copy', {
                items: [i],
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get('copyOverwriteConfirmationTitle'),
                    message: kloudspeaker.ui.texts.get('copyOverwriteConfirmationMsg', [i.name]),
                    callback: function() {
                        mfs._copy(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs._copyMany = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        return kloudspeaker.service.post("filesystem/items/", {
            action: 'copy',
            items: i,
            to: to,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/copy', {
                items: i,
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                var files = e.data.files;

                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get(files.length > 1 ? 'copyManyOverwriteConfirmationTitle' : 'copyOverwriteConfirmationTitle'),
                    message: files.length > 1 ? kloudspeaker.ui.texts.get('copyManyOverwriteConfirmationMsg', [files.length]) : kloudspeaker.ui.texts.get('copyOverwriteConfirmationMsg', [files[0].name]),
                    callback: function() {
                        mfs._copyMany(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs.move = function(i, to) {
        if (!i) return;

        if (window.isArray(i) && i.length > 1) {
            if (!to) {
                var df = $.Deferred();
                kloudspeaker.ui.dialogs.folderSelector({
                    title: kloudspeaker.ui.texts.get('moveMultipleFileDialogTitle'),
                    message: kloudspeaker.ui.texts.get('moveMultipleFileMessage', [i.length]),
                    actionTitle: kloudspeaker.ui.texts.get('moveFileDialogAction'),
                    handler: {
                        onSelect: function(f) {
                            mfs._validated(mfs._moveMany, [i, f], "move", kloudspeaker.ui.texts.get("actionDeniedMoveMany", i.length), kloudspeaker.ui.texts.get("actionAcceptMoveMany", i.length)).done(df.resolve).fail(df.reject);
                        },
                        canSelect: function(f) {
                            return mfs.canMoveTo(i, f);
                        }
                    }
                });
                return df.promise();
            } else
                return mfs._moveMany(i, to);
        }

        if (window.isArray(i)) i = i[0];

        if (!to) {
            var df2 = $.Deferred();
            kloudspeaker.ui.dialogs.folderSelector({
                title: kloudspeaker.ui.texts.get('moveFileDialogTitle'),
                message: kloudspeaker.ui.texts.get('moveFileMessage', [i.name]),
                actionTitle: kloudspeaker.ui.texts.get('moveFileDialogAction'),
                handler: {
                    onSelect: function(f) {
                        mfs._validated(mfs._move, [i, f], "move", kloudspeaker.ui.texts.get("actionDeniedMove", i.name), kloudspeaker.ui.texts.get("actionAcceptMove", i.name)).done(df2.resolve).fail(df2.reject);
                    },
                    canSelect: function(f) {
                        return mfs.canMoveTo(i, f);
                    }
                }
            });
            return df2.promise();
        } else
            return mfs._move(i, to);
    };

    mfs._move = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        return kloudspeaker.service.post("filesystem/" + i.id + "/move/", {
            id: to.id,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/move', {
                items: [i],
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get('moveOverwriteConfirmationTitle'),
                    message: kloudspeaker.ui.texts.get('moveOverwriteConfirmationMsg', [i.name]),
                    callback: function() {
                        mfs._move(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs._moveMany = function(i, to, acceptKeys, overwrite) {
        var df = $.Deferred();
        return kloudspeaker.service.post("filesystem/items/", {
            action: 'move',
            items: i,
            to: to,
            overwrite: !!overwrite,
            acceptKeys: acceptKeys
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/move', {
                items: i,
                to: to
            });
            df.resolve(r);
        }).fail(function(e) {
            if (e.code == 204) {
                this.handled = true;
                var files = e.data.files;

                kloudspeaker.ui.dialogs.confirmation({
                    title: kloudspeaker.ui.texts.get(files.length > 1 ? 'moveManyOverwriteConfirmationTitle' : 'moveOverwriteConfirmationTitle'),
                    message: files.length > 1 ? kloudspeaker.ui.texts.get('moveManyOverwriteConfirmationMsg', [files.length]) : kloudspeaker.ui.texts.get('moveOverwriteConfirmationMsg', [files[0].name]),
                    callback: function() {
                        mfs._moveMany(i, to, acceptKeys, true).done(df.resolve).fail(df.reject);
                    }
                })
            } else {
                df.reject(e);
            }
        });
        return df;
    };

    mfs.rename = function(item, name) {
        if (!name || name.length === 0) {
            var df = $.Deferred();
            kloudspeaker.ui.dialogs.input({
                title: kloudspeaker.ui.texts.get(item.is_file ? 'renameDialogTitleFile' : 'renameDialogTitleFolder'),
                message: kloudspeaker.ui.texts.get('renameDialogNewName'),
                defaultValue: item.name,
                yesTitle: kloudspeaker.ui.texts.get('renameDialogRenameButton'),
                noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
                handler: {
                    isAcceptable: function(n) {
                        return !!n && n.length > 0 && n != item.name;
                    },
                    onInput: function(n) {
                        $.when(mfs._rename(item, n)).then(df.resolve, df.reject);
                    }
                }
            });
            return df.promise();
        } else {
            return mfs._rename(item, name);
        }
    };

    mfs._rename = function(item, name) {
        return kloudspeaker.service.put("filesystem/" + item.id + "/name/", {
            name: name
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/rename', {
                items: [item],
                name: name
            });
        });
    };

    mfs._validated = function(cbf, args, action, denyMessage, acceptMessage) {
        var df = $.Deferred();
        cbf.apply(mfs, args).done(df.resolve).fail(function(e) {
            // request denied
            if (e.code == 109 && e.data && e.data.items) {
                this.handled = true;
                kloudspeaker.ui.actions.handleDenied(action, e.data, denyMessage, acceptMessage).done(function(acceptKeys) {
                    var argsWithKeys = args.slice(0);
                    argsWithKeys.push(acceptKeys);

                    cbf.apply(mfs, argsWithKeys).done(df.resolve).fail(df.reject);
                }).fail(function() {
                    df.reject(e);
                });
            } else df.reject(e);
        });
        return df;
    }

    mfs.del = function(i) {
        if (!i) return;

        var df = $.Deferred();
        if (window.isArray(i) && i.length > 1) {
            mfs._validated(mfs._delMany, [i], "delete", kloudspeaker.ui.texts.get("actionDeniedDeleteMany", i.length), kloudspeaker.ui.texts.get("actionAcceptDeleteMany", i.length)).done(df.resolve).fail(df.reject);
            return df.promise();
        }

        if (window.isArray(i)) i = i[0];
        mfs._validated(mfs._del, [i], "delete", kloudspeaker.ui.texts.get("actionDeniedDelete", i.name), kloudspeaker.ui.texts.get("actionAcceptDelete", i.name)).done(df.resolve).fail(df.reject);
        return df.promise();
    };

    mfs._del = function(item, acceptKeys) {
        return kloudspeaker.service.del("filesystem/" + item.id, acceptKeys ? {
            acceptKeys: acceptKeys
        } : null).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/delete', {
                items: [item]
            });
        });
    };

    mfs._delMany = function(i, acceptKeys) {
        return kloudspeaker.service.post("filesystem/items/", {
            action: 'delete',
            items: i,
            acceptKeys: (acceptKeys ? acceptKeys : null)
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/delete', {
                items: i
            });
        });
    };

    mfs.createFolder = function(folder, name) {
        return kloudspeaker.service.post("filesystem/" + folder.id + "/folders/", {
            name: name
        }).done(function(r) {
            kloudspeaker.events.dispatch('filesystem/createfolder', {
                items: [folder],
                name: name
            });
        });
    };

    /* PLUGINS */

    var pl = kloudspeaker.plugins;
    pl._list = {};

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
                var settings = ((kloudspeaker.settings.plugins && kloudspeaker.settings.plugins[id]) ? kloudspeaker.settings.plugins[id] : false) || {};
                p.initialize(settings);
            }
            if (p.resources) {
                var pid = p.backendPluginId || id;
                if (p.resources.texts) {
                    if (kloudspeaker.settings.texts_js)
                        l.push(kloudspeaker.dom.importScript(kloudspeaker.plugins.getJsLocalizationUrl(pid)));
                    else
                        l.push(kloudspeaker.ui.texts.loadPlugin(pid));
                }
                if (p.resources.css) kloudspeaker.dom.importCss(kloudspeaker.plugins.getStyleUrl(pid));
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
        $.each(kloudspeaker.helpers.getKeys(list), function(i, k) {
            var p = list[k];
            if (p.client_plugin) l.push(kloudspeaker.dom.importScript(p.client_plugin));
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
        var ps = kloudspeaker.session && kloudspeaker.session.data.plugins[id];
        var custom = (ps && ps.custom);

        var url = custom ? kloudspeaker.session.data.resources.custom_url : kloudspeaker.settings["service-path"];
        url = url + "plugin/" + id;

        if (!p) return url;
        return url + (admin ? "/admin/" : "/client/") + p;
    };

    pl.adminUrl = function(id, p) {
        return pl.url(id) + "/admin/" + p;
    };

    pl.getLocalizationUrl = function(id) {
        return pl.url(id) + "/localization/texts_" + kloudspeaker.ui.texts.locale + ".json";
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
        if (!items || !window.isArray(items) || items.length < 1) return data;

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
        if (model.activate) model.attached($e);
    };

    /* HELPERS */

    kloudspeaker.helpers = {
        generatePassword: function(l) {
            var length = l || 8;
            var password = '';
            var c;

            for (var i = 0; i < length; i++) {
                while (true) {
                    c = (parseInt(Math.random() * 1000, 10) % 94) + 33;
                    if (kloudspeaker.helpers.isValidPasswordChar(c)) break;
                }
                password += String.fromCharCode(c);
            }
            return password;
        },

        isValidPasswordChar: function(c) {
            if (c >= 33 && c <= 47) return false;
            if (c >= 58 && c <= 64) return false;
            if (c >= 91 && c <= 96) return false;
            if (c >= 123 && c <= 126) return false;
            return true;
        },

        getPluginActions: function(plugins) {
            var list = [];

            if (plugins) {
                for (var id in plugins) {
                    var p = plugins[id];
                    if (p.actions) {
                        list.push({
                            title: "-",
                            type: 'separator'
                        });
                        $.merge(list, p.actions);
                    }
                }
            }
            var downloadActions = [];
            var firstDownload = -1;
            for (var i = 0, j = list.length; i < j; i++) {
                var a = list[i];
                if (a.group == 'download') {
                    if (firstDownload < 0) firstDownload = i;
                    downloadActions.push(a);
                }
            }
            if (downloadActions.length > 1) {
                for (var i2 = 1, j2 = downloadActions.length; i2 < j2; i2++) list.remove(downloadActions[i2]);
                list[firstDownload] = {
                    type: "submenu",
                    items: downloadActions,
                    title: downloadActions[0].title,
                    group: downloadActions[0].group,
                    primary: downloadActions[0]
                };
            }
            return list;
        },

        getPrimaryActions: function(actions) {
            if (!actions) return [];
            var result = [];
            var p = function(list) {
                for (var i = 0, j = list.length; i < j; i++) {
                    var a = list[i];
                    if (a.type == 'primary' || a.group == 'download') result.push(a);
                }
            }
            p(actions);
            return result;
        },

        getSecondaryActions: function(actions) {
            if (!actions) return [];
            var result = [];
            for (var i = 0, j = actions.length; i < j; i++) {
                var a = actions[i];
                if (a.id == 'download' || a.type == 'primary') continue;
                result.push(a);
            }
            return kloudspeaker.helpers.cleanupActions(result);
        },

        cleanupActions: function(actions) {
            if (!actions) return [];
            var last = -1;
            for (var i = actions.length - 1, j = 0; i >= j; i--) {
                var a = actions[i];
                if (a.type != 'separator' && a.title != '-') {
                    last = i;
                    break;
                }
            }
            if (last < 0) return [];

            var first = -1;
            for (var i2 = 0; i2 <= last; i2++) {
                var a2 = actions[i2];
                if (a2.type != 'separator' && a2.title != '-') {
                    first = i2;
                    break;
                }
            }
            actions = actions.splice(first, (last - first) + 1);
            var prevSeparator = false;
            for (var i3 = actions.length - 1, j2 = 0; i3 >= j2; i3--) {
                var a3 = actions[i3];
                var separator = (a3.type == 'separator' || a3.title == '-');
                if (separator && prevSeparator) actions.splice(i3, 1);
                prevSeparator = separator;
            }

            return actions;
        },

        breakUrl: function(u) {
            var parts = u.split("?");
            return {
                path: parts[0],
                params: kloudspeaker.helpers.getUrlParams(u),
                paramsString: (parts.length > 1 ? ("?" + parts[1]) : "")
            };
        },

        getUrlParams: function(u) {
            var params = {};
            $.each(u.substring(1).split("&"), function(i, p) {
                var pp = p.split("=");
                if (!pp || pp.length < 2) return;
                params[decodeURIComponent(pp[0])] = decodeURIComponent(pp[1]);
            });
            return params;
        },

        urlWithParam: function(url, param, v) {
            var p = param;
            if (v) p = param + "=" + encodeURIComponent(v);
            return url + (window.strpos(url, "?") ? "&" : "?") + p;
        },

        noncachedUrl: function(url) {
            return kloudspeaker.helpers.urlWithParam(url, "_=" + kloudspeaker._time);
        },

        hasPermission: function(list, name, required) {
            if (!list || list[name] === undefined) return false;
            if (kloudspeaker.session.user.admin) return true;

            var v = list[name];

            var options = kloudspeaker.session.data.permission_types.values[name];
            if (!required || !options) return (v == "1");

            var ui = options.indexOf(v);
            var ri = options.indexOf(required);
            return (ui >= ri);
        },

        formatDateTime: function(time, fmt) {
            var ft = time.toString(fmt);
            return ft;
        },

        parseInternalTime: function(time) {
            if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;

            var ts = new Date();
            /*ts.setUTCFullYear(time.substring(0,4));
            ts.setUTCMonth(time.substring(4,6) - 1);
            ts.setUTCDate(time.substring(6,8));
            ts.setUTCHours(time.substring(8,10));
            ts.setUTCMinutes(time.substring(10,12));
            ts.setUTCSeconds(time.substring(12,14));*/
            ts.setYear(time.substring(0, 4));
            ts.setMonth(time.substring(4, 6) - 1);
            ts.setDate(time.substring(6, 8));
            ts.setHours(time.substring(8, 10));
            ts.setMinutes(time.substring(10, 12));
            ts.setSeconds(time.substring(12, 14));
            return ts;
        },

        formatInternalTime: function(time) {
            if (!time) return null;

            /*var year = pad(""+time.getUTCFullYear(), 4, '0', STR_PAD_LEFT);
            var month = pad(""+(time.getUTCMonth() + 1), 2, '0', STR_PAD_LEFT);
            var day = pad(""+time.getUTCDate(), 2, '0', STR_PAD_LEFT);
            var hour = pad(""+time.getUTCHours(), 2, '0', STR_PAD_LEFT);
            var min = pad(""+time.getUTCMinutes(), 2, '0', STR_PAD_LEFT);
            var sec = pad(""+time.getUTCSeconds(), 2, '0', STR_PAD_LEFT);
            return year + month + day + hour + min + sec;*/
            //var timeUTC = new Date(Date.UTC(time.getYear(), time.getMonth(), time.getDay(), time.getHours(), time.getMinutes(), time.getSeconds()));
            return kloudspeaker.helpers.formatDateTime(time, 'yyyyMMddHHmmss');
        },

        mapByKey: function(list, key, value) {
            var byKey = {};
            if (!list) return byKey;
            for (var i = 0, j = list.length; i < j; i++) {
                var r = list[i];
                if (!window.def(r)) continue;
                var v = r[key];
                if (!window.def(v)) continue;

                if (window.def(value) && r[value])
                    byKey[v] = r[value];
                else
                    byKey[v] = r;
            }
            return byKey;
        },

        getKeys: function(m) {
            var list = [];
            if (m)
                for (var k in m) {
                    if (!m.hasOwnProperty(k)) continue;
                    list.push(k);
                }
            return list;
        },

        extractValue: function(list, key) {
            var l = [];
            for (var i = 0, j = list.length; i < j; i++) {
                var r = list[i];
                l.push(r[key]);
            }
            return l;
        },

        filter: function(list, f) {
            var result = [];
            $.each(list, function(i, it) {
                if (f(it)) result.push(it);
            });
            return result;
        },

        arrayize: function(i) {
            var a = [];
            if (!window.isArray(i)) {
                a.push(i);
            } else {
                return i;
            }
            return a;
        }
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
            if (typeof(to) == 'undefined' && typeof(from) == 'object')
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
