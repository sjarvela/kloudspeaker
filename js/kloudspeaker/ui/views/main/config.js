define(['kloudspeaker/instance', 'kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/permissions', 'kloudspeaker/dom', 'kloudspeaker/templates', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/views', 'kloudspeaker/localization', 'kloudspeaker/utils', 'kloudspeaker/ui'], function(app, settings, session, plugins, service, fs, permissions, dom, templates, controls, dialogs, views, loc, utils, ui) {
    return function() {
        var that = this;
        this.viewId = "config";

        this._settings = false;
        this._views = [];
        this._adminViews = [];
        this._allViews = [];
        this._adminViewsLoaded = false;

        this.init = function(mv) {
            that._mainview = mv;
            that.title = loc.get('configviewMenuTitle');
            that.icon = "cogs";

            var s = session.get();

            // legacy
            $.each(plugins.getConfigViewPlugins(), function(i, p) {
                if (!p.configViewHandler.views) return;

                var views = p.configViewHandler.views();
                if (!views) return;

                $.each(views, function(i, v) {
                    if (v.admin) {
                        if (s.user.admin || (v.requiresPermission && permissions.hasPermission(v.requiresPermission)))
                            that._adminViews.push(v);
                    } else
                        that._views.push(v);
                });
            });
            // new
            _.each(ui._configViews, function(v) {
                if (v.admin) {
                    if (s.user.admin || (v.requiresPermission && permissions.hasPermission(v.requiresPermission)))
                        that._adminViews.push(v);
                } else {
                    that._views.push(v);
                }
            });

            that._allViews = that._views.concat(that._adminViews);
            _.each(that._allViews, function(v) {
                v.title = that._getViewTitle(v);
            });
        }

        this.onResize = function() {}

        this.onActivate = function(h) {
            templates.load("configview", templates.url("configview.html")).done(function() {
                dom.template("kloudspeaker-tmpl-configview").appendTo(h.content);

                that.showLoading(true);

                var navBarItems = [];
                $.each(that._views, function(i, v) {
                    navBarItems.push({
                        title: that._getViewTitle(v),
                        obj: v,
                        callback: function() {
                            that._activateView(v);
                        }
                    })
                });

                that._userNav = h.addNavBar({
                    title: loc.get("configViewUserNavTitle"),
                    items: navBarItems
                });

                that._mainview.showSubviewList(that._allViews, function(v) {
                    that._activateView(v, !!v.admin);
                });

                that.onResize();

                var s = session.get();
                if (s.user.admin && !that._settings)
                    service.get("configuration/settings").done(function(s) {
                        that._settings = s;
                        that._initAdminViews(h);
                    });
                else
                    that._initAdminViews(h);
            });
        }

        this._initAdminViews = function(h) {
            if (that._adminViews && that._adminViews.length > 0) {
                $.each(that._adminViews, function(i, v) {
                    if (v.init) v.init(that._settings, that);
                });

                var navBarItems = [];
                $.each(that._adminViews, function(i, v) {
                    navBarItems.push({
                        title: that._getViewTitle(v),
                        obj: v,
                        callback: function() {
                            that._activateView(v, true);
                        }
                    })
                });

                that._adminNav = h.addNavBar({
                    title: loc.get("configViewAdminNavTitle"),
                    items: navBarItems
                });
            }

            that._onInitDone(h);
        };

        this._getViewTitle = function(v) {
            var title = v.title;
            if (typeof(title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
            if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));
            return title;
        }

        this._findView = function(id) {
            var found = false;
            $.each(that._views, function(i, v) {
                if (v.id == id || v.viewId == id) {
                    found = {
                        view: v,
                        admin: false
                    };
                    return false;
                }
            });
            if (!found)
                $.each(that._adminViews, function(i, v) {
                    if (v.id == id || v.viewId == id) {
                        found = {
                            view: v,
                            admin: true
                        };
                        return false;
                    }
                });

            return found;
        };

        this._onInitDone = function(h) {
            if (h.id) {
                var view = that._findView(h.id[0]);
                if (view) that._activateView(view.view, view.admin);
            } else
                that._activateView(that._views[0]);
        }

        this.onRestoreView = function(id) {
            var view = that._findView(id[0]);
            if (view) that._activateView(view.view, view.admin, true);
        };

        this._activateView = function(v, admin, noStore) {
            if (that._activeView) {
                if (that._activeView.onDeactivate) that._activeView.onDeactivate();
                if (that._adminNav) that._adminNav.setActive(false);
                that._userNav.setActive(false);
            }
            if (admin) that._adminNav.setActive(v);
            else that._userNav.setActive(v);

            that._mainview.setActiveSubview(v);

            that.showLoading(false);

            var title = v.title;
            if (typeof(title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
            if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));

            if (v.model) {
                var model = v.model;
                var p = {
                    settings: that._settings
                };
                if (utils.isArray(model)) {
                    p = model[1];
                    model = model[0];
                }
                $("#kloudspeaker-configview-header").html("").hide();
                ui.viewmodel(v.view, [model, p], that._getContentElement().empty()).done(function(m) {
                    that._activeView = m;

                    if (!noStore && (v.id || v.viewId)) app.storeView("config/" + (v.id || v.viewId));
                    if (!m.customTitle) $("#kloudspeaker-configview-header").html(m.title || title || '').show();
                });
            } else {
                // legacy
                that._activeView = v;

                if (!noStore && that._activeView.viewId) app.storeView("config/" + that._activeView.viewId);
                $("#kloudspeaker-configview-header").html(title).show();
                v.onActivate(that._getContentElement().empty(), that);
            }
        }

        this._getContentElement = function() {
            return $("#kloudspeaker-configview-content");
        }

        this.onDeactivate = function() {
            if (that._activeView && that._activeView.onDeactivate) that._activeView.onDeactivate();
        }

        this.showLoading = function(s) {
            if (s) that._getContentElement().find(".kloudspeaker-configlistview").addClass("loading");
            else that._getContentElement().find(".kloudspeaker-configlistview").removeClass("loading");
        }
    };
});
