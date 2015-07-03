define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/ui/views/main/files'], function(app, settings, FilesView) {
    //TODO remove reference to global "kloudspeaker"
    return function() {
        var that = this;
        that._mainFileView = false;
        that._mainConfigView = false;
        that._views = [];
        that._currentView = false;

        that.init = function($c, viewId) {
            that._mainFileView = new FilesView();
            that._mainConfigView = new kloudspeaker.view.MainViewConfigView();
            that._views = [that._mainFileView, that._mainConfigView];

            $.each(kloudspeaker.plugins.getMainViewPlugins(), function(i, p) {
                if (!p.mainViewHandler) return;
                var view = p.mainViewHandler();
                that._views.push(view);
            });

            that.itemContext = new kloudspeaker.ui.itemContext();
            return kloudspeaker.dom.loadContentInto($c, kloudspeaker.templates.url("mainview.html"), function() {
                that.onLoad(viewId);
            }, ['localize']);
        }

        that.destroy = function() {
            if (that._currentView && that._currentView.onDeactivate) that._currentView.onDeactivate();
            $.each(that._views, function(i, v) {
                if (v.deinit) v.deinit(that);
            });
        }

        that.onLoad = function(viewId) {
            $(window).resize(that.onResize);
            that.onResize();

            kloudspeaker.dom.template("kloudspeaker-tmpl-main-username", kloudspeaker.session).appendTo("#kloudspeaker-mainview-user");
            if (kloudspeaker.session.user) {
                kloudspeaker.ui.controls.dropdown({
                    element: $('#kloudspeaker-username-dropdown'),
                    items: that.getSessionActions()
                });
            }

            var menuitems = [];
            $.each(that._views, function(i, v) {
                v.init(that);
                menuitems.push({
                    icon: v.icon,
                    title: v.title
                });
            });

            var $mb = $("#kloudspeaker-mainview-menu");
            var $mbitems = kloudspeaker.dom.template("kloudspeaker-tmpl-main-menubar", menuitems).appendTo($mb);
            $mbitems.click(function() {
                var i = $mbitems.index($(this));
                that.activateView(that._views[i]);
            });

            if (that._views.length > 0) {
                var view = false;
                if (viewId) {
                    view = that._findView(viewId[0]);
                    viewId = viewId.slice(1);
                    if (viewId.length === 0 || (viewId.length == 1 && viewId[0] === "")) viewId = false;
                }
                if (!view) {
                    view = that._views[0];
                    viewId = false;
                }
                that.activateView(view, viewId);
            }
        };

        that._findView = function(id) {
            var found = false;
            $.each(that._views, function(i, v) {
                if (v.viewId == id) {
                    found = v;
                    return false;
                }
            });
            return found;
        };

        that.onRestoreView = function(id) {
            var viewId = id[0];
            if (that._currentView && that._currentView.viewId == viewId) {
                that._currentView.onRestoreView(id.slice(1));
            } else {
                var view = that._findView(viewId);
                if (view) {
                    viewId = id.slice(1);
                    if (viewId.length === 0 || (viewId.length == 1 && viewId[0] === "")) viewId = false;
                    that.activateView(view, viewId);
                }
            }
        };

        that.activateView = function(v, id) {
            kloudspeaker.ui.hideActivePopup();
            if (that._currentView && that._currentView.onDeactivate) that._currentView.onDeactivate();
            $("#kloudspeaker-mainview-navlist-parent").empty();

            that._currentView = v;

            $("#kloudspeaker-mainview-navbar").empty();
            v.onActivate({
                id: id,
                content: $("#kloudspeaker-mainview-viewcontent").empty(),
                tools: $("#kloudspeaker-mainview-viewtools").empty(),
                addNavBar: that.addNavBar,
                mainview: that,
                fileview: that._mainFileView
            });
            var $mnu = $("#kloudspeaker-mainview-menu");
            var $items = $mnu.find(".kloudspeaker-mainview-menubar-item").removeClass("active");
            var i = that._views.indexOf(v);
            $($items.get(i)).addClass("active");
        };

        that.onNotification = function(spec) {
            var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#" + spec.target) : spec.target) : $("#kloudspeaker-mainview-content");
            var $ntf = kloudspeaker.dom.template("kloudspeaker-tmpl-main-notification", spec).hide().appendTo($trg);
            $ntf.fadeIn(300, function() {
                setTimeout(function() {
                    $ntf.fadeOut(300, function() {
                        $ntf.remove();
                        if (spec["on-finish"]) spec["on-finish"]();
                    });
                    if (spec["on-show"]) spec["on-show"]();
                }, spec.time | 3000);
            });
            return true;
        };

        that.getActiveView = function() {
            return that._currentView;
        };

        that.addNavBar = function(nb) {
            var $nb = kloudspeaker.dom.template("kloudspeaker-tmpl-main-navbar", nb).appendTo($("#kloudspeaker-mainview-navlist-parent"));
            var items = nb.items;
            var initItems = function() {
                var $items = $nb.find(".kloudspeaker-mainview-navbar-item");
                if (nb.classes) $items.addClass(nb.classes);
                if (nb.dropdown) {
                    $items.each(function(i, e) {
                        var item = items[$items.index(this)];
                        var $tr = $('<li class="kloudspeaker-mainview-navbar-dropdown"><a href="#" class="dropdown-toggle"><i class="icon-cog"></i></a></li>').appendTo($(e));
                        var dropdownItems = [];
                        if (typeof(nb.dropdown.items) != 'function') dropdownItems = nb.dropdown.items;
                        kloudspeaker.ui.controls.dropdown({
                            element: $tr,
                            items: dropdownItems,
                            onShow: function(api, menuItems) {
                                if (menuItems.length > 0) return;
                                if (typeof(nb.dropdown.items) == 'function') {
                                    api.items(nb.dropdown.items(item.obj));
                                }
                            }
                        });
                    });
                }
                $items.click(function() {
                    var item = items[$items.index(this)];
                    if (item.callback) item.callback();
                });
                if (nb.onRender) nb.onRender($nb, $items, function($e) {
                    var ind = $items.index($e);
                    return items[ind].obj;
                });
            };
            initItems();
            return {
                element: $nb,
                setActive: function(o) {
                    var $items = $nb.find(".kloudspeaker-mainview-navbar-item");
                    $items.removeClass("active");
                    if (!o) return;
                    $.each($items, function(i, itm) {
                        var obj = items[i].obj;
                        if (!obj) return;

                        var match = window.def(o.id) ? o.id == obj.id : o == obj;
                        if (match) {
                            $(itm).addClass("active");
                            return false;
                        }
                    });
                },
                update: function(l) {
                    items = l;
                    $nb.find(".kloudspeaker-mainview-navbar-item").remove();
                    kloudspeaker.dom.template("kloudspeaker-tmpl-main-navbar-item", items).appendTo($nb);
                    initItems();
                }
            };
        }

        that.onResize = function() {
            if (that._currentView) that._currentView.onResize();
        }

        that.getSessionActions = function() {
            var actions = [];
            if (kloudspeaker.features.hasFeature('change_password') && kloudspeaker.session.user.auth == 'pw' && kloudspeaker.session.user.hasPermission("change_password")) {
                actions.push({
                    "title-key": "mainViewChangePasswordTitle",
                    callback: that.changePassword
                });
                actions.push({
                    "title": "-"
                });
            }
            actions.push({
                "title-key": "mainViewLogoutTitle",
                callback: that.onLogout
            });
            return actions;
        }

        that.onLogout = function() {
            kloudspeaker.service.post("session/logout").done(function(s) {
                kloudspeaker.events.dispatch('session/end');
            });
        }

        that.changePassword = function() {
            var $dlg = false;
            var $old = false;
            var $new1 = false;
            var $new2 = false;
            var $hint = false;
            var errorTextMissing = kloudspeaker.ui.texts.get('mainviewChangePasswordErrorValueMissing');
            var errorConfirm = kloudspeaker.ui.texts.get('mainviewChangePasswordErrorConfirm');

            var doChangePassword = function(oldPw, newPw, hint, successCb) {
                kloudspeaker.service.put("configuration/users/current/password/", {
                    old: window.Base64.encode(oldPw),
                    "new": window.Base64.encode(newPw),
                    hint: hint
                }).done(function(r) {
                    successCb();
                    kloudspeaker.ui.dialogs.notification({
                        message: kloudspeaker.ui.texts.get('mainviewChangePasswordSuccess')
                    });
                }).fail(function(e) {
                    that.handled = true;
                    if (e.code == 107) {
                        kloudspeaker.ui.dialogs.notification({
                            message: kloudspeaker.ui.texts.get('mainviewChangePasswordError'),
                            type: 'error',
                            cls: 'full',
                            target: $dlg.find(".modal-footer")
                        });
                    } else that.handled = false;
                });
            }

            kloudspeaker.ui.dialogs.custom({
                title: kloudspeaker.ui.texts.get('mainviewChangePasswordTitle'),
                content: $("#kloudspeaker-tmpl-main-changepassword").tmpl({
                    message: kloudspeaker.ui.texts.get('mainviewChangePasswordMessage')
                }),
                buttons: [{
                    id: "yes",
                    "title": kloudspeaker.ui.texts.get('mainviewChangePasswordAction'),
                    cls: "btn-primary"
                }, {
                    id: "no",
                    "title": kloudspeaker.ui.texts.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    var old = false;
                    var new1 = false;
                    var new2 = false;
                    var hint = false;

                    if (btn.id === 'yes') {
                        $dlg.find(".control-group").removeClass("error");
                        $dlg.find(".help-inline").text("");

                        // check
                        old = $old.find("input").val();
                        new1 = $new1.find("input").val();
                        new2 = $new2.find("input").val();
                        hint = $hint.find("input").val();

                        if (!old) {
                            $old.addClass("error");
                            $old.find(".help-inline").text(errorTextMissing);
                        }
                        if (!new1) {
                            $new1.addClass("error");
                            $new1.find(".help-inline").text(errorTextMissing);
                        }
                        if (!new2) {
                            $new2.addClass("error");
                            $new2.find(".help-inline").text(errorTextMissing);
                        }
                        if (new1 && new2 && new1 != new2) {
                            $new1.addClass("error");
                            $new2.addClass("error");
                            $new1.find(".help-inline").text(errorConfirm);
                            $new2.find(".help-inline").text(errorConfirm);
                        }
                        if (!old || !new1 || !new2 || new1 != new2) return;
                    }

                    if (btn.id === 'yes') doChangePassword(old, new1, hint || '', d.close);
                    else d.close();
                },
                "on-show": function(h, $d) {
                    $dlg = $d;
                    $old = $("#kloudspeaker-mainview-changepassword-old");
                    $new1 = $("#kloudspeaker-mainview-changepassword-new1");
                    $new2 = $("#kloudspeaker-mainview-changepassword-new2");
                    $hint = $("#kloudspeaker-mainview-changepassword-hint");

                    $old.find("input").focus();
                }
            });
        }
        return that;
    };
});
