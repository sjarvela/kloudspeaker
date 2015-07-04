/**
 * ui.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict";

    /* UI */
    //kloudspeaker.ui.uploader = false;
    //kloudspeaker.ui.draganddrop = false;
    kloudspeaker.ui._activePopup = false;

    kloudspeaker.ui.initialize = function() {
        kloudspeaker.ui.controls = require('kloudspeaker/ui/controls'); //TODO remove
        kloudspeaker.ui.dialogs = require('kloudspeaker/ui/dialogs'); //TODO remove
        kloudspeaker.ui.formatters = require('kloudspeaker/ui/formatters'); //TODO remove
        kloudspeaker.ui.parsers = require('kloudspeaker/ui/parsers'); //TODO remove

        var list = [];
        list.push(kloudspeaker.ui.initializeLang());

        // add invisible download frame
        $("body").append('<div style="width: 0px; height: 0px; overflow: hidden;"><iframe id="kloudspeaker-download-frame" src=""></iframe></div>');

        $(window).click(function(e) {
            // hide popups when clicked outside
            if (kloudspeaker.ui._activePopup) {
                if (e && e.toElement && kloudspeaker.ui._activePopup.element) {
                    var popupElement = kloudspeaker.ui._activePopup.element();
                    if (popupElement.has($(e.toElement)).length > 0) return;
                }
                kloudspeaker.ui.hideActivePopup();
            }
        });
        list.push(kloudspeaker.templates.load("dialogs.html"));

        //if (!kloudspeaker.ui.draganddrop) kloudspeaker.ui.draganddrop = (window.Modernizr.draganddrop) ? new kloudspeaker.HTML5DragAndDrop() : new kloudspeaker.JQueryDragAndDrop();
        /*if (!kloudspeaker.ui.uploader) {
            var Uploader = require("kloudspeaker/ui/uploader");
            kloudspeaker.ui.uploader = new Uploader();
        }*/
        //if (!kloudspeaker.ui.clipboard) new kloudspeaker.ZeroClipboard(function(cb) {
        //    kloudspeaker.ui.clipboard = cb;
        //});

        var df = $.Deferred();
        $.when.apply($, list).done(df.resolve).fail(df.reject);
        return df;
    };

    kloudspeaker.ui.initializeLang = function() {
        var df = $.Deferred();
        var lang = (kloudspeaker.session.user && kloudspeaker.session.user.lang) ? kloudspeaker.session.user.lang : (kloudspeaker.settings.language["default"] || 'en');

        //TODO remove global
        if (!kloudspeaker.ui.texts) kloudspeaker.ui.texts = require('kloudspeaker/localization');

        if (kloudspeaker.ui.texts.locale && kloudspeaker.ui.texts.locale == lang) return df.resolve();

        var pluginTextsLoaded = kloudspeaker.ui.texts._pluginTextsLoaded;
        if (kloudspeaker.ui.texts.locale) {
            kloudspeaker.App.getElement().removeClass("lang-" + kloudspeaker.ui.texts.locale);
            kloudspeaker.ui.texts.clear();
        }

        var list = [];
        list.push(kloudspeaker.ui.texts.load(lang).done(function(locale) {
            $("html").attr("lang", locale);
            kloudspeaker.App.getElement().addClass("lang-" + locale);
        }));

        if (pluginTextsLoaded) {
            $.each(pluginTextsLoaded, function(i, id) {
                list.push(kloudspeaker.ui.texts.loadPlugin(id));
            });
        }
        $.when.apply($, list).done(df.resolve).fail(df.reject);
        return df;
    };

    kloudspeaker.ui.hideActivePopup = function() {
        if (kloudspeaker.ui._activePopup) kloudspeaker.ui._activePopup.hide();
        kloudspeaker.ui._activePopup = false;
    };

    kloudspeaker.ui.activePopup = function(p) {
        if (p === undefined) return kloudspeaker.ui._activePopup;
        if (kloudspeaker.ui._activePopup) {
            if (p.parentPopupId && kloudspeaker.ui._activePopup.id == p.parentPopupId) return;
            kloudspeaker.ui._activePopup.hide();
        }
        kloudspeaker.ui._activePopup = p;
        if (!kloudspeaker.ui._activePopup.id) kloudspeaker.ui._activePopup.id = new Date().getTime();
        return kloudspeaker.ui._activePopup.id;
    };

    kloudspeaker.ui.isActivePopup = function(id) {
        return (kloudspeaker.ui._activePopup && kloudspeaker.ui._activePopup.id == id);
    };

    kloudspeaker.ui.removeActivePopup = function(id) {
        if (!id || !kloudspeaker.ui.isActivePopup(id)) return;
        kloudspeaker.ui._activePopup = false;
    };

    kloudspeaker.ui.download = function(url) {
        if (kloudspeaker.App.mobile)
            window.open(url);
        else
            $("#kloudspeaker-download-frame").attr("src", url);
    };

    kloudspeaker.ui.viewmodel = function(view, model, $target) {
        if (!model) return null;

        var df = $.Deferred();
        var $v = null;
        if (view) {
            if (typeof(view) == "string") {
                if (view.startsWith("#"))
                    $v = kloudspeaker.dom.template(view.substring(1));
                //otherwise considered view id resolved via composition & requirejs
            } else if (window.isArray(view)) {
                var tmpl = view[0],
                    d = (view.length > 1) ? view[1] : null;
                $v = kloudspeaker.dom.template(tmpl, d);
            } else if (typeof(view) == "object") {
                $v = view;
            }
        }
        if ($target && $v) $target.append($v);

        if (typeof(model) == "string" || window.isArray(model)) {
            var _view = false;
            var _model = window.isArray(model) ? model[0] : model;
            if (!view) _view = _model; //TODO platform
            else if (typeof(view) == "string") _view = view; //TODO platform

            var ctx = (window.isArray(model) && model.length > 1) ? model[1] : {};
            if (!$v) {
                var c = {
                    model: _model,
                    activationData: ctx,
                    compositionComplete: function() {
                        var $e = $(this.parent);
                        kloudspeaker.ui.process($e, ['localize']);

                        df.resolve(this.model, $e);
                    }
                };
                if (_view) c.view = _view;
                kloudspeaker.ui._composition.compose($target[0], c, {});
            } else {
                require([_model], function(m) {
                    if (typeof(m) == 'function') m = m();
                    kloudspeaker.dom.bind(m, ctx, $v);
                    df.resolve(m, $v);
                });
            }
        } else {
            kloudspeaker.dom.bind(model, null, $v);
            df.resolve(model, $v);
        }
        return df;
    };

    /**/

    kloudspeaker.ui.assign = function(h, id, c) {
        if (!h || !id || !c) return;
        if (!h.controls) h.controls = {};
        h.controls[id] = c;
    };

    kloudspeaker.ui.process = function($e, ids, handler) {
        $.each(ids, function(i, k) {
            if (kloudspeaker.ui.handlers[k]) kloudspeaker.ui.handlers[k]($e, handler);
        });
    };

    kloudspeaker.ui.handlers = {
        localize: function(p, h) {
            p.find(".localized").each(function() {
                var $t = $(this);
                var key = $t.attr('title-key');
                if (key) {
                    $t.attr("title", kloudspeaker.ui.texts.get(key));
                    $t.removeAttr('title-key');
                }

                key = $t.attr('text-key');
                if (key) {
                    $t.prepend(kloudspeaker.ui.texts.get(key));
                    $t.removeAttr('text-key');
                }
            });
            p.find("input.hintbox").each(function() {
                var $this = $(this);
                var hint = kloudspeaker.ui.texts.get($this.attr('hint-key'));
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
                var b = kloudspeaker.ui.controls.bubble({
                    element: $t,
                    handler: h
                });
                kloudspeaker.ui.assign(h, $t.attr('id'), b);
            });
        },

        radio: function(p, h) {
            p.find(".kloudspeaker-radio").each(function() {
                var $t = $(this);
                var r = kloudspeaker.ui.controls.radio($t, h);
                kloudspeaker.ui.assign(h, $t.attr('id'), r);
            });
        }
    };

    kloudspeaker.ui.window = {
        open: function(url) {
            window.open(url);
        }
    };

    kloudspeaker.ui.actions = {
        handleDenied: function(action, data, msgTitleDenied, msgTitleAccept) {
            var df = $.Deferred();
            var handlers = [];
            var findItem = function(id) {
                if (!window.isArray(data.target)) return data.target;

                for (var i = 0, j = data.target.length; i < j; i++) {
                    if (data.target[i].id == id) return data.target[i];
                }
                return null;
            };
            for (var k in data.items) {
                var plugin = kloudspeaker.plugins.get(k);
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
                kloudspeaker.ui.dialogs.confirmActionAccept(msgTitleAccept, validationMessages, function() {
                    df.resolve(acceptKeys);
                }, df.reject);
            } else {
                kloudspeaker.ui.dialogs.showActionDeniedMessage(msgTitleDenied, nonAcceptable);
                df.reject();
            }
            return df;
        }
    };

    kloudspeaker.ui.preloadImages = function(a) {
        $.each(a, function() {
            $('<img/>')[0].src = this;
        });
    };

    kloudspeaker.ui.FullErrorView = function(title, msg) {
        this.show = function() {
            this.init(kloudspeaker.App.getElement());
        };

        this.init = function($c) {
            if (kloudspeaker.App._initialized)
                kloudspeaker.dom.template("kloudspeaker-tmpl-fullpage-error", {
                    title: title,
                    message: msg
                }).appendTo($c.empty());
            else {
                var err = '<h1>' + title + '</h1><p>' + msg + '</p>';
                $c.html(err);
            }
        };
    };
}(window.jQuery, window.kloudspeaker);
