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

    /* FORMATTERS */

    kloudspeaker.ui.formatters = {
        ByteSize: function(nf) {
            this.format = function(b) {
                if (!window.def(b)) return "";

                var bytes = b;
                if (typeof(b) === "string") {
                    bytes = parseInt(bytes, 10);
                    if (isNaN(bytes)) return "";
                } else if (typeof(b) !== "number") return "";

                if (bytes < 1024)
                    return (bytes == 1 ? kloudspeaker.ui.texts.get('sizeOneByte') : kloudspeaker.ui.texts.get('sizeInBytes', nf.format(bytes)));

                if (bytes < (1024 * 1024)) {
                    var kilobytes = bytes / 1024;
                    return (kilobytes == 1 ? kloudspeaker.ui.texts.get('sizeOneKilobyte') : kloudspeaker.ui.texts.get('sizeInKilobytes', nf.format(kilobytes)));
                }

                if (bytes < (1024 * 1024 * 1024)) {
                    var megabytes = bytes / (1024 * 1024);
                    return kloudspeaker.ui.texts.get('sizeInMegabytes', nf.format(megabytes));
                }

                var gigabytes = bytes / (1024 * 1024 * 1024);
                return kloudspeaker.ui.texts.get('sizeInGigabytes', nf.format(gigabytes));
            };
        },
        Timestamp: function(fmt) {
            this.format = function(ts) {
                if (ts == null) return "";
                if (typeof(ts) === 'string') ts = kloudspeaker.helpers.parseInternalTime(ts);
                return ts.toString(fmt);
            };
        },
        Number: function(precision, unit, ds) {
            this.format = function(n) {
                if (!window.def(n) || typeof(n) !== 'number') return "";

                var s = Math.pow(10, precision);
                var v = Math.floor(n * s) / s;
                var sv = v.toString();
                if (ds) sv = sv.replace(".", ds);
                if (unit) return sv + " " + unit;
                return sv;
            };
        },
        FilesystemItemPath: function(noHtml) {
            this.format = function(item) {
                if (!item) return "";
                return (kloudspeaker.filesystem.rootsById[item.root_id] ? kloudspeaker.filesystem.rootsById[item.root_id].name : item.root_id) + (item.path.length > 0 ? (":" + (noHtml ? ' ' : '&nbsp;') + item.path) : "");
            }
        }
    };

    kloudspeaker.ui.parsers = {
        Number: function(precision) {
            this.parse = function(v) {
                if (!v || typeof(v) !== 'string') return null;
                var text = v.trim();
                var neg = (text.substring(0, 1) == '-');
                text = text.replace(/[^0-9,.]/g, "");

                try {
                    var n = parseFloat(text.replace(/\,/g, '.'));
                    if (isNaN(n) || typeof(n) !== 'number') return null;
                    if (window.def(precision)) {
                        var p = Math.pow(10, precision);
                        n = Math.floor(n * p + 0.50) / p;
                    }
                    return neg ? n * -1 : n;
                } catch (e) {
                    return null;
                }
            };
        }
    };

    /* UI */
    //kloudspeaker.ui.uploader = false;
    //kloudspeaker.ui.draganddrop = false;
    kloudspeaker.ui._activePopup = false;

    kloudspeaker.ui.initialize = function() {
        kloudspeaker.ui.controls = require('kloudspeaker/ui/controls'); //TODO remove

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

    kloudspeaker.ui.itemContext = function(o) {
        var ict = {};
        ict._activeItemContext = false;

        ict.open = function(spec) {
            var item = spec.item;
            var $e = spec.element;
            var $c = spec.viewport;
            var $t = spec.container;
            var folder = spec.folder;

            var popupId = "mainview-itemcontext-" + item.id;
            if (kloudspeaker.ui.isActivePopup(popupId)) {
                return;
            }

            var openedId = false;
            if (ict._activeItemContext) {
                openedId = ict._activeItemContext.item.id;
                ict._activeItemContext.close();
                ict._activeItemContext = false;
            }
            if (item.id == openedId) return;

            var $cont = $t || $e.parent();
            var html = kloudspeaker.dom.template("kloudspeaker-tmpl-main-itemcontext", item, {})[0].outerHTML;
            $e.popover({
                title: item.name,
                html: true,
                placement: 'bottom',
                trigger: 'manual',
                template: '<div class="popover kloudspeaker-itemcontext-popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
                content: html,
                container: $cont
            }).bind("shown", function(e) {
                var api = {
                    id: popupId,
                    hide: function() {
                        $e.popover('destroy');
                    }
                };
                api.close = api.hide;
                kloudspeaker.ui.activePopup(api);

                var $el = $("#kloudspeaker-itemcontext-" + item.id);
                var $pop = $el.closest(".popover");
                var maxRight = $c.outerWidth();
                var popLeft = $pop.offset().left - $cont.offset().left;
                var popW = $pop.outerWidth();
                if (popLeft < 0)
                    popLeft = 0;
                else if ((popLeft + popW) > maxRight)
                    popLeft = maxRight - popW - 10;
                $pop.css("left", popLeft + "px");

                var arrowPos = ($e.offset().left - $cont.offset().left) + ($e.outerWidth() / 2);
                arrowPos = Math.max(0, (arrowPos - popLeft));
                $pop.find(".arrow").css("left", arrowPos + "px");

                $pop.find(".popover-title").append($('<button type="button" class="close">×</button>').click(api.close));
                var $content = $el.find(".kloudspeaker-itemcontext-content");

                kloudspeaker.filesystem.itemDetails(item, kloudspeaker.plugins.getItemContextRequestData(item)).done(function(d) {
                    if (!d) {
                        $t.hide();
                        return;
                    }

                    var ctx = {
                        details: d,
                        hasPermission: function(name, required) {
                            return kloudspeaker.helpers.hasPermission(d.permissions, name, required);
                        },
                        hasParentPermission: function(name, required) {
                            return kloudspeaker.helpers.hasPermission(d.parent_permissions, name, required);
                        },
                        folder: spec.folder,
                        folder_writable: spec.folder_writable
                    };
                    ict.renderItemContext(api, $content, item, ctx);
                    //$e[0].scrollIntoView();
                });
            }).bind("hidden", function() {
                $e.unbind("shown").unbind("hidden");
                kloudspeaker.ui.removeActivePopup(popupId);
            });
            $e.popover('show');
        };

        ict.renderItemContext = function(cApi, $e, item, ctx) {
            var df = kloudspeaker.features.hasFeature("descriptions");
            var dp = ctx.hasPermission("edit_description");
            var descriptionEditable = df && dp;
            var showDescription = descriptionEditable || !!ctx.details.metadata.description;

            var plugins = kloudspeaker.plugins.getItemContextPlugins(item, ctx);
            var actions = kloudspeaker.helpers.getPluginActions(plugins);
            var primaryActions = kloudspeaker.helpers.getPrimaryActions(actions);
            var secondaryActions = kloudspeaker.helpers.getSecondaryActions(actions);

            var o = {
                item: item,
                details: ctx.details,
                showDescription: showDescription,
                description: ctx.details.metadata.description || '',
                session: kloudspeaker.session,
                plugins: plugins,
                primaryActions: primaryActions
            };

            $e.removeClass("loading").empty().append(kloudspeaker.dom.template("kloudspeaker-tmpl-main-itemcontext-content", o, {
                title: function(o) {
                    var a = o;
                    if (a.type == 'submenu') a = a.primary;
                    return a.title ? a.title : kloudspeaker.ui.texts.get(a['title-key']);
                }
            }));
            $e.click(function(e) {
                // prevent from closing the popup when clicking the popup itself
                e.preventDefault();
                return false;
            });
            kloudspeaker.ui.process($e, ["localize"]);

            if (descriptionEditable) {
                kloudspeaker.ui.controls.editableLabel({
                    element: $("#kloudspeaker-itemcontext-description"),
                    hint: kloudspeaker.ui.texts.get('itemcontextDescriptionHint'),
                    onedit: function(desc) {
                        kloudspeaker.service.put("filesystem/" + item.id + "/description/", {
                            description: desc
                        }).done(function() {
                            kloudspeaker.events.dispatch("filesystem/item-update", {
                                item: item,
                                property: 'description',
                                value: desc
                            });
                        });
                    }
                });
            }

            if (primaryActions) {
                var $pae = $e.find(".kloudspeaker-itemcontext-primary-action-button");
                $pae.each(function(i, $b) {
                    var a = primaryActions[i];
                    if (a.type == 'submenu') {
                        kloudspeaker.ui.controls.dropdown({
                            element: $b,
                            items: a.items,
                            hideDelay: 0,
                            style: 'submenu',
                            parentPopupId: cApi.id,
                            onItem: function() {
                                cApi.hide();
                            },
                            onBlur: function(dd) {
                                dd.hide();
                            }
                        });
                    }
                });
                $pae.click(function(e) {
                    var i = $pae.index($(this));
                    var action = primaryActions[i];
                    if (action.type == 'submenu') return;
                    cApi.close();
                    action.callback();
                });
            }

            if (plugins) {
                var $selectors = $("#kloudspeaker-itemcontext-details-selectors");
                var $content = $("#kloudspeaker-itemcontext-details-content");
                var contents = {};
                var onSelectDetails = function(id) {
                    $(".kloudspeaker-itemcontext-details-selector").removeClass("active");
                    $("#kloudspeaker-itemcontext-details-selector-" + id).addClass("active");
                    $content.find(".kloudspeaker-itemcontext-plugin-content").hide();

                    var $c = contents[id] ? contents[id] : false;
                    if (!$c) {
                        $c = $('<div class="kloudspeaker-itemcontext-plugin-content"></div>');
                        plugins[id].details["on-render"](cApi, $c, ctx);
                        contents[id] = $c;
                        $content.append($c);
                    }

                    $c.show();
                };
                var firstPlugin = false;
                var selectorClick = function() {
                    var s = $(this).tmplItem().data;
                    onSelectDetails(s.id);
                };
                for (var id in plugins) {
                    var plugin = plugins[id];
                    if (!plugin.details) continue;

                    if (!firstPlugin) firstPlugin = id;

                    var title = plugin.details.title ? plugin.details.title : (plugin.details["title-key"] ? kloudspeaker.ui.texts.get(plugin.details["title-key"]) : id);
                    var selector = kloudspeaker.dom.template("kloudspeaker-tmpl-main-itemcontext-details-selector", {
                        id: id,
                        title: title,
                        data: plugin
                    }).appendTo($selectors).click(selectorClick);
                }

                if (firstPlugin) onSelectDetails(firstPlugin);
            }

            kloudspeaker.ui.controls.dropdown({
                element: $e.find("#kloudspeaker-itemcontext-secondary-actions"),
                items: secondaryActions,
                hideDelay: 0,
                style: 'submenu',
                parentPopupId: cApi.id,
                onItem: function() {
                    cApi.hide();
                },
                onBlur: function(dd) {
                    dd.hide();
                }
            });
        }

        return {
            open: ict.open
        };
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

    /* DIALOGS */

    kloudspeaker.ui.dialogs = {};
    var dh = kloudspeaker.ui.dialogs;

    dh._dialogDefaults = {
        title: "Kloudspeaker"
    };

    dh.closeActiveDialog = function() {
        if (!dh._activeDialog) return;
        dh._activeDialog.close();
    };

    dh.info = function(spec) {
        dh.custom({
            title: spec.title,
            content: $("#kloudspeaker-tmpl-dialog-info").tmpl({
                message: spec.message
            }),
            buttons: [{
                id: "ok",
                "title-key": "ok",
                cls: "btn-primary"
            }],
            "on-button": function(btn, d) {
                d.close();
                if (spec.callback) spec.callback();
            }
        });
        /*var dlg = $("#kloudspeaker-tmpl-dialog-info").tmpl($.extend(spec, dialogDefaults)).dialog({
            modal: true,
            resizable: false,
            height: 'auto',
            minHeight: 50
        });
        kloudspeaker.ui.handlers.localize(dlg);
        dlg.find("#kloudspeaker-info-dialog-close-button").click(function() { dlg.dialog('destroy'); dlg.remove(); });*/
    };

    dh.showActionDeniedMessage = function(title, reasons) {
        //TODO template
        var msg = '<p>' + title + '</p><p><ul>';
        for (var i = 0, j = reasons.length; i < j; i++) {
            msg = msg + "<li>" + reasons[i] + "</li>";
        }
        msg = msg + "</ul></p>";
        kloudspeaker.ui.dialogs.error({
            title: kloudspeaker.ui.texts.get('errorDialogTitle'),
            message: msg
        });
    }

    dh.confirmActionAccept = function(title, reasons, confirmCb, cancelCb) {
        //TODO template
        var msg = '<p>' + title + '</p><p><ul>';
        for (var i = 0, j = reasons.length; i < j; i++) {
            msg = msg + "<li>" + reasons[i] + "</li>";
        }
        msg = msg + "</ul></p>";
        dh.custom({
            title: kloudspeaker.ui.texts.get('errorDialogTitle'),
            content: msg,
            buttons: [{
                id: "yes",
                "title-key": "yes",
                cls: "btn-primary"
            }, {
                id: "no",
                "title-key": "no"
            }],
            "on-button": function(btn, d) {
                d.close();
                if (btn.id === 'yes')
                    if (confirmCb) confirmCb();
                    else if (cancelCb) cancelCb();
            }
        });
    }

    dh.showError = function(error) {
        var msg = 'errorDialogMessage_' + error.code;
        if (!kloudspeaker.ui.texts.has(msg)) msg = 'errorDialogUnknownError';
        if (kloudspeaker.session.user && kloudspeaker.session.user.admin && error.trace) {
            dh.custom({
                title: kloudspeaker.ui.texts.get('errorDialogTitle'),
                content: $("#kloudspeaker-tmpl-dialog-error-debug").tmpl({
                    title: kloudspeaker.ui.texts.get('errorDialogTitle'),
                    message: kloudspeaker.ui.texts.get(msg),
                    debug: error.trace.join("<br/>")
                }),
                buttons: [{
                    id: "ok",
                    "title-key": "ok",
                    cls: "btn-primary"
                }],
                "on-button": function(btn, d) {
                    d.close();
                }
            });
        } else {
            kloudspeaker.ui.dialogs.error({
                title: kloudspeaker.ui.texts.get('errorDialogTitle'),
                message: kloudspeaker.ui.texts.get(msg)
            });
        }
    };

    dh.select = function(spec) {
        var table = false;
        dh.custom({
            title: spec.title,
            initSize: spec.initSize,
            content: $("#kloudspeaker-tmpl-dialog-select").tmpl({
                message: spec.message
            }),
            buttons: [{
                id: "ok",
                "title-key": "ok",
                cls: "btn-primary"
            }, {
                id: "cancel",
                "title-key": "dialogCancel"
            }],
            "on-button": function(btn, d) {
                var sel;
                if (btn.id == "ok") {
                    sel = table.getSelected();
                    if (!sel || sel.length === 0) return;
                }
                d.close();
                if (btn.id == "ok" && spec.onSelect) {
                    spec.onSelect(sel, table.getValues());
                }
            },
            "on-show": function(h, $dlg) {
                var $table = $($dlg.find(".kloudspeaker-selectdialog-table")[0]);
                table = kloudspeaker.ui.controls.table($table, {
                    key: spec.key,
                    selectOnEdit: true,
                    columns: [{
                        type: "selectrow"
                    }].concat(spec.columns)
                });
                table.set(spec.list);
            }
        });
    };

    dh.error = function(spec) {
        dh.custom({
            title: spec.title,
            content: $("#kloudspeaker-tmpl-dialog-error").tmpl({
                message: spec.message
            }),
            buttons: [{
                id: "ok",
                "title-key": "ok",
                cls: "btn-primary"
            }],
            "on-button": function(btn, d) {
                d.close();
                if (spec.callback) spec.callback();
            }
        });
    };

    dh.confirmation = function(spec) {
        var opts = false;
        if (spec.options) {
            opts = [];
            $.each(kloudspeaker.helpers.getKeys(spec.options), function(i, k) {
                opts.push({
                    key: k,
                    title: spec.options[k]
                });
            });
        }
        dh.custom({
            title: spec.title,
            content: $("#kloudspeaker-tmpl-dialog-confirmation").tmpl({
                message: spec.message,
                options: opts
            }),
            buttons: [{
                id: "yes",
                "title-key": "yes"
            }, {
                id: "no",
                "title-key": "no"
            }],
            "on-button": function(btn, d, $d) {
                var checkedOpts = {};
                $d.find("input.kloudspeaker-confirmation-option:checked").each(function() {
                    checkedOpts[$(this).attr('id').substring(33)] = true;
                });
                d.close();
                if (spec.callback && btn.id === 'yes') spec.callback(checkedOpts);
            }
        });
    };

    dh.input = function(spec) {
        var $input = false;
        dh.custom({
            title: spec.title,
            content: $("#kloudspeaker-tmpl-dialog-input").tmpl({
                message: spec.message
            }),
            buttons: [{
                id: "yes",
                "title": spec.yesTitle,
                cls: "btn-primary"
            }, {
                id: "no",
                "title": spec.noTitle
            }],
            "on-button": function(btn, d) {
                if (btn.id === 'yes') {
                    if (!spec.handler || !spec.handler.isAcceptable) return;
                    if (!spec.handler.isAcceptable($input.val())) return;
                }
                d.close();
                if (btn.id === 'yes') spec.handler.onInput($input.val());
            },
            "on-show": function(h, $dlg) {
                $input = $dlg.find(".kloudspeaker-inputdialog-input");
                if (spec.defaultValue) $input.val(spec.defaultValue);
                $input.focus();
            }
        });
    };

    dh.wait = function(spec) {
        var $trg = (spec && spec.target) ? $("#" + spec.target) : $("body");
        var w = kloudspeaker.dom.template("kloudspeaker-tmpl-wait", $.extend(spec, dh._dialogDefaults)).appendTo($trg).show();
        return {
            close: function() {
                w.remove();
            }
        };
    };

    dh.notification = function(spec) {
        if (kloudspeaker.App.activeView && kloudspeaker.App.activeView.onNotification && kloudspeaker.App.activeView.onNotification(spec)) return;

        var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#" + spec.target) : spec.target) : $("#kloudspeaker-notification-container, .kloudspeaker-notification-container").first();
        if ($trg.length === 0) $trg = $("body");
        var notification = kloudspeaker.dom.template("kloudspeaker-tmpl-notification", $.extend(spec, dh._dialogDefaults)).hide().appendTo($trg);
        notification.fadeIn(300, function() {
            setTimeout(function() {
                notification.fadeOut(300, function() {
                    notification.remove();
                    if (spec["on-finish"]) spec["on-finish"]();
                });
                if (spec["on-show"]) spec["on-show"]();
            }, spec.time | 3000);
        });
    };

    dh.custom = function(spec) {
        var center = function($d) {
            $d.css("margin-left", -$d.outerWidth() / 2);
            $d.css("margin-top", -$d.outerHeight() / 2);
            $d.css("top", "50%");
            $d.css("left", "50%");
        };
        var s = spec;
        if (s['title-key']) s.title = kloudspeaker.ui.texts.get(s['title-key']);

        var getButtonTitle = function(b) {
            if (b.title) return b.title;
            if (b["title-key"]) return kloudspeaker.ui.texts.get(b["title-key"]);
            return "";
        };
        var $dlg = $("#kloudspeaker-tmpl-dialog-custom").tmpl($.extend(dh._dialogDefaults, s), {
            getContent: function() {
                if (spec.html) return spec.html;
                if (spec.content) {
                    var c = spec.content;
                    if (typeof c === 'string') return c;
                    return $("<div/>").append(c.clone()).html();
                }
                return "";
            },
            getButtonTitle: getButtonTitle
        });
        $dlg.on('hidden', function(e) {
            if (e.target != $dlg[0]) return;
            $dlg.remove();
        }).modal({
            backdrop: 'static', //!!spec.backdrop,
            keyboard: true,
            show: false
        });
        var df = $.Deferred();
        var h = {
            close: function() {
                if (_model)
                    ko.utils.domNodeDisposal.removeNode($body[0]);
                $dlg.modal('hide');
                dh._activeDialog = false;
            },
            center: function() {
                center($dlg);
            },
            setTitle: function(t) {
                $dlg.find(".modal-header > h3").text(t);
                onResize();
            },
            setInfo: function(n) {
                var $n = $dlg.find(".modal-footer > .info").empty();
                if (n) $n.html(n);
            },
            resolve: df.resolve,
            complete: function(o) {
                h.close();
                df.resolve(o);
            },
            reject: df.reject,
            cancel: function() {
                h.close();
                df.reject();
            },
            done: df.done,
            fail: df.fail
        };
        var $body = $dlg.find(".modal-body");
        var $header = $dlg.find(".modal-header");
        var $footer = $dlg.find(".modal-footer");
        var _model = false;
        var magicNr = 30; //$body.css("padding-top") + $body.css("padding-bottom"); //TODO??
        var heightAdjust, maxHeight;
        $footer.on("click", ".btn", function(e) {
            e.preventDefault();
            var ind = $footer.find(".btn").index($(this));
            var btn = spec.buttons[ind];
            if (_model && _model.onDialogButton) _model.onDialogButton.apply(h, [btn.id]);
            else if (spec["on-button"]) spec["on-button"](btn, h, $dlg);
            else {
                h.close();
            }
        });
        var onResize = function() {
            center($dlg);
            var h = Math.min($dlg.innerHeight() - heightAdjust, maxHeight);
            $body.css("height", h);
        }

        var _onDialogReady = function() {
                if (spec.html || spec.content) kloudspeaker.ui.handlers.localize($dlg);
                if (!spec.buttons && _model && _model.getDialogButtons) {
                    spec.buttons = _model.getDialogButtons();
                    $("#kloudspeaker-tmpl-dialog-button").tmpl(spec.buttons, {
                        getButtonTitle: getButtonTitle
                    }).appendTo($footer.find(".buttons").empty());
                }
                $dlg.modal('show');
                heightAdjust = $header.outerHeight() + $footer.outerHeight() + magicNr;
                maxHeight = $(window).height() - 50;

                if (spec.resizable) {
                    $body.css({
                        "max-height": "none",
                        "max-width": "none"
                    });
                    $dlg.css({
                        "max-height": "none",
                        "max-width": "none",
                        "min-height": Math.min($dlg.outerHeight(), maxHeight) + "px",
                        "min-width": $dlg.outerWidth() + "px"
                    }).on("resize", onResize).resizable();
                    if (spec.initSize) {
                        $dlg.css({
                            "width": spec.initSize[0] + "px",
                            "height": Math.min(maxHeight, spec.initSize[1]) + "px"
                        });
                    } else {
                        if ($dlg.outerHeight() > maxHeight) $dlg.height(maxHeight);
                    }
                    onResize();
                } else {
                    $dlg.css({
                        "max-height": maxHeight + "px"
                    });
                }

                var $f = $dlg.find("input[autofocus]");
                if ($f.length > 0) $f.focus();

                if (spec["on-show"]) spec["on-show"](h, $dlg);
                if (_model && _model.onShow) _model.onShow(h);
            }
            // content options: element, template, model or none
        if (spec.element) {
            $dlg.find(".modal-body").append(spec.element);
            kloudspeaker.ui.handlers.localize($dlg);
            _onDialogReady();
        } else if (spec.model) {
            kloudspeaker.ui.viewmodel(spec.view, spec.model, $body).done(function(m) {
                _model = m;
                _onDialogReady();
            });
        } else {
            _onDialogReady();
        }

        dh._activeDialog = h;
        return h;
    };

    dh.folderSelector = function(spec) {
        return dh.itemSelector($.extend({
            allowFiles: false
        }, spec));
    };

    dh.itemSelector = function(s) {
        var spec = $.extend({
            allowFiles: true,
            allowFolders: true,
            allRoots: false
        }, s);
        var selectedItem = false;
        var content = $("#kloudspeaker-tmpl-dialog-itemselector").tmpl({
            message: spec.message
        });
        var $selector = false;
        var loaded = {};

        var load = function($e, parent) {
            if (loaded[parent ? parent.id : "root"]) return;

            $selector.addClass("loading");
            kloudspeaker.filesystem.items(parent, spec.allowFiles, spec.allRoots).done(function(r) {
                $selector.removeClass("loading");
                loaded[parent ? parent.id : "root"] = true;

                var all = r.files ? (r.folders.concat(r.files)) : r.folders;

                if (!all || all.length === 0) {
                    if ($e) $e.find(".kloudspeaker-itemselector-folder-indicator").empty();
                    return;
                }

                var level = 0;
                var levels = [];
                if (parent) {
                    var matches = parent.path.match(/\//g);
                    if (matches) level = matches.length + 1;
                    else level = 1;

                    //generate array for template to iterate
                    for (var i = 0; i < level; i++) levels.push({});
                }
                var c = $("#kloudspeaker-tmpl-dialog-itemselector-item").tmpl(all, {
                    cls: (level === 0 ? 'root' : ''),
                    levels: levels
                });
                if ($e) {
                    $e.after(c);
                    $e.addClass("loaded");
                    if ($e) $e.find(".kloudspeaker-itemselector-folder-indicator").find("i").removeClass("icon-caret-right").addClass("icon-caret-down");
                } else {
                    $selector.append(c);
                }
                if (!parent && all.length == 1) {
                    load($(c[0]), all[0]);
                }
            });
        };

        dh.custom({
            title: spec.title,
            content: content,
            buttons: [{
                id: "action",
                "title": spec.actionTitle,
                cls: "btn-primary"
            }, {
                id: "cancel",
                "title-key": "dialogCancel"
            }],
            "on-button": function(btn, d) {
                if (btn.id === 'action') {
                    if (!selectedItem || !spec.handler || !spec.handler.canSelect(selectedItem)) return;
                }
                d.close();
                if (btn.id === 'action') spec.handler.onSelect(selectedItem);

            },
            "on-show": function(h, $dlg) {
                $selector = $dlg.find(".kloudspeaker-itemselector-tree");
                $selector.on("click", ".kloudspeaker-itemselector-folder-indicator", function(e) {
                    var $e = $(this).parent();
                    var p = $e.tmplItem().data;
                    load($e, p);
                    return false;
                });
                $selector.on("click", ".kloudspeaker-itemselector-item", function(e) {
                    var $e = $(this);
                    var p = $(this).tmplItem().data;
                    if (p.is_file && !spec.allowFiles) return;
                    if (!p.is_file && !spec.allowFolders) return;

                    if (spec.handler.canSelect(p)) {
                        selectedItem = p;
                        $(".kloudspeaker-itemselector-item").removeClass("selected");
                        $e.addClass("selected");
                    }
                });
                load(null, null);
            }
        });
    };

    dh.tableView = function(o) {
        kloudspeaker.ui.dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            title: o.title,
            content: kloudspeaker.dom.template("kloudspeaker-tmpl-tableview"),
            buttons: o.buttons,
            "on-button": function(btn, d) {
                o.onButton(btn, d);
            },
            "on-show": function(h, $d) {
                var $content = $d.find("#kloudspeaker-tableview-content");

                h.center();
                var table = kloudspeaker.ui.controls.table("kloudspeaker-tableview-list", {
                    key: o.table.key,
                    columns: o.table.columns,
                    onRowAction: function(id, obj) {
                        if (o.onTableRowAction) o.onTableRowAction(h, table, id, obj);
                    }
                });

                o.onRender(h, $content, table);
            }
        });
    };
}(window.jQuery, window.kloudspeaker);
