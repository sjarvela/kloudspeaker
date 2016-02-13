define(['kloudspeaker/platform', 'kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/templates', 'kloudspeaker/utils', 'kloudspeaker/dom', 'knockout'], function(platform, settings, plugins, templates, utils, dom, ko) {
    var app = null;
    var session = null; //TODO remove session (move data to params)
    var loc = null;
    var ui = {};

    ui._activePopup = false;

    ui.setup = function() {
        app = require('kloudspeaker/instance');
        session = require('kloudspeaker/session');
        loc = require('kloudspeaker/localization');

        require(['kloudspeaker/ui/formatters', 'kloudspeaker/ui/parsers', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs'], function(formatters, parsers, controls, dialogs) {
            ui.controls = controls; //TODO remove
            ui.dialogs = dialogs; //TODO remove
            ui.formatters = formatters; //TODO remove
            ui.parsers = parsers; //TODO remove
        });
    };

    ui.initialize = function() {
        var list = [];
        //list.push(ui.initializeLang());

        // add invisible download frame
        $("body").append('<div style="width: 0px; height: 0px; overflow: hidden;"><iframe id="kloudspeaker-download-frame" src=""></iframe></div>');

        $(window).click(function(e) {
            // hide popups when clicked outside
            if (ui._activePopup) {
                if (e && e.toElement && ui._activePopup.element) {
                    var popupElement = ui._activePopup.element();
                    if (popupElement.has($(e.toElement)).length > 0) return;
                }
                ui.hideActivePopup();
            }
        });
        list.push(templates.load("dialogs.html"));

        var df = $.Deferred();
        $.when.apply($, list).done(df.resolve).fail(df.reject);
        return df;
    };

    ui.hideActivePopup = function() {
        if (ui._activePopup) ui._activePopup.hide();
        ui._activePopup = false;
    };

    ui.activePopup = function(p) {
        if (p === undefined) return ui._activePopup;
        if (ui._activePopup) {
            if (p.parentPopupId && ui._activePopup.id == p.parentPopupId) return;
            ui._activePopup.hide();
        }
        ui._activePopup = p;
        if (!ui._activePopup.id) ui._activePopup.id = new Date().getTime();
        return ui._activePopup.id;
    };

    ui.isActivePopup = function(id) {
        return (ui._activePopup && ui._activePopup.id == id);
    };

    ui.removeActivePopup = function(id) {
        if (!id || !ui.isActivePopup(id)) return;
        ui._activePopup = false;
    };

    ui.download = function(url) {
        if (app.mobile)
            window.open(url);
        else
            $("#kloudspeaker-download-frame").attr("src", url);
    };

    ui.viewmodel = function(view, model, $target) {
        if (!model) return null;

        var df = $.Deferred();
        var $v = null;
        if (view) {
            if (typeof(view) == "string") {
                if (view.startsWith("#"))
                    $v = dom.template(view.substring(1));
                //otherwise considered view id resolved via composition & requirejs
            } else if (utils.isArray(view)) {
                var tmpl = view[0],
                    d = (view.length > 1) ? view[1] : null;
                $v = dom.template(tmpl, d);
            } else if (typeof(view) == "object") {
                $v = view;
            }
        }
        if ($target && $v) $target.append($v);

        if (typeof(model) == "string" || utils.isArray(model)) {
            var _view = false;
            var _model = utils.isArray(model) ? model[0] : model;
            if (!view) _view = _model; //TODO platform
            else if (typeof(view) == "string") _view = view; //TODO platform

            var ctx = (utils.isArray(model) && model.length > 1) ? model.slice(1) : {};
            if (!$v) {
                var c = {
                    model: _model,
                    activationData: ctx,
                    compositionComplete: function() {
                        var $e = $(this.parent);
                        ui.process($e, ['localize']);

                        df.resolve(this.model, $e);
                    }
                };
                if (_view) c.view = _view;
                platform.composition.compose($target[0], c, {}); //TODO
            } else {
                require([_model], function(m) {
                    if (typeof(m) == 'function') m = m(ctx);
                    dom.bind(m, ctx, $v);
                    if (m.attached) m.attached($v, $target);
                    df.resolve(m, $v);
                });
            }
        } else {
            dom.bind(model, null, $v);
            if (model.attached) model.attached($v, $target);
            df.resolve(model, $v);
        }
        return df;
    };

    /**/

    ui.assign = function(h, id, c) {
        if (!h || !id || !c) return;
        if (!h.controls) h.controls = {};
        h.controls[id] = c;
    };

    ui.process = function($e, ids, handler) {
        $.each(ids, function(i, k) {
            if (ui.handlers[k]) ui.handlers[k]($e, handler);
        });
    };

    ui.handlers = {
        localize: function(p, h) {
            p.find(".localized").each(function() {
                var $t = $(this);
                var key = $t.attr('title-key');
                if (key) {
                    $t.attr("title", loc.get(key));
                    $t.removeAttr('title-key');
                }

                key = $t.attr('text-key');
                if (key) {
                    $t.prepend(loc.get(key));
                    $t.removeAttr('text-key');
                }
            });
            p.find("input.hintbox").each(function() {
                var $this = $(this);
                var hint = loc.get($this.attr('hint-key'));
                $this.attr("placeholder", hint).removeAttr("hint-key");
            }); //.placeholder();
        },

        center: function(p, h) {
            p.find(".center").each(function() {
                var $this = $(this);
                var x = ($this.parent().width() - $this.outerWidth(true)) / 2;
                $this.css({
                    position: "relative",
                    left: x
                });
            });
        },

        hover: function(p) {
            p.find(".hoverable").hover(function() {
                $(this).addClass("hover");
            }, function() {
                $(this).removeClass("hover");
            });
        },

        bubble: function(p, h) {
            p.find(".bubble-trigger").each(function() {
                var $t = $(this);
                var b = ui.controls.bubble({
                    element: $t,
                    handler: h
                });
                ui.assign(h, $t.attr('id'), b);
            });
        },

        radio: function(p, h) {
            p.find(".kloudspeaker-radio").each(function() {
                var $t = $(this);
                var r = ui.controls.radio($t, h);
                ui.assign(h, $t.attr('id'), r);
            });
        }
    };

    ui.window = {
        open: function(url) {
            window.open(url);
        }
    };

    //TODO move into module
    ui.actions = {
        handleDenied: function(action, data, msgTitleDenied, msgTitleAccept) {
            var df = $.Deferred();
            var handlers = [];
            var findItem = function(id) {
                if (!utils.isArray(data.target)) return data.target;

                for (var i = 0, j = data.target.length; i < j; i++) {
                    if (data.target[i].id == id) return data.target[i];
                }
                return null;
            };
            for (var k in data.items) {
                var plugin = plugins.get(k);
                if (!plugin || !plugin.actionValidationHandler) return false;

                var handler = plugin.actionValidationHandler();
                handlers.push(handler);

                var items = data.items[k];
                for (var m = 0, l = items.length; m < l; m++) {
                    var item = items[m];
                    if (typeof(item.item) == 'string') item.item = findItem(item.item);
                }
            }

            var validationMessages = [];
            var nonAcceptable = [];
            var acceptKeys = [];
            var allAcceptable = true;
            for (var ind = 0, j = handlers.length; ind < j; ind++) {
                var msg = handlers[ind].getValidationMessages(action, data.items[k], data);
                for (var mi = 0, mj = msg.length; mi < mj; mi++) {
                    var ms = msg[mi];
                    acceptKeys.push(ms.acceptKey);
                    validationMessages.push(ms.message);
                    if (!msgTitleAccept || !ms.acceptable) nonAcceptable.push(ms.message);
                }
            }
            if (nonAcceptable.length === 0) {
                // retry with accept keys
                ui.dialogs.confirmActionAccept(msgTitleAccept, validationMessages, function() {
                    df.resolve(acceptKeys);
                }, df.reject);
            } else {
                ui.dialogs.showActionDeniedMessage(msgTitleDenied, nonAcceptable);
                df.reject();
            }
            return df;
        }
    };

    ui.preloadImages = function(a) {
        $.each(a, function() {
            $('<img/>')[0].src = this;
        });
    };

    ui.showPopup = function(spec) {
        var $p = $('<div class="kloudspeaker-popup-container"/>').appendTo($("body"));

        var handle = {
            close: function() {
                ko.utils.domNodeDisposal.removeNode($p[0]);
                $p.remove();
            }
        };
        var m = spec.model;
        if (utils.isArray(m)) spec.model.push(handle);
        else spec.model = [m, handle];
        ui.viewmodel(spec.view, spec.model, $p).done(function(m) {});
    };

    ui.showError = function(e) {
        var args = Array.prototype.slice.call(arguments);
        if (!args || args.length === 0) return;

        var title = 'Failed to initialize Kloudspeaker';
        var msg = '';
        var $c = app._initialized ? app.getElement() : $("body");

        if (args.length == 1) {
            if (typeof(args[0]) == "string") title = args[0];
            if (typeof(args[0]) == "object") {
                var o = args[0];
                msg = o.msg;
                if (o.title) title = o.title;
            }
        } else if (args.length >= 2 && (typeof(args[0]) == "string") && (typeof(args[1]) == "string")) {
            title = args[0];
            msg = args[0];
        }

        if (app._initialized)
            dom.template("kloudspeaker-tmpl-fullpage-error", {
                title: title,
                message: msg
            }).appendTo($c.empty());
        else {
            var err = '<h1>' + title + '</h1><p>' + msg + '</p>';
            $c.html(err);
        }
    };

    return ui;
});
