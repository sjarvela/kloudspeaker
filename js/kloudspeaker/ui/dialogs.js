define(['kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/localization', 'kloudspeaker/ui/controls', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/ui'], function(session, fs, loc, controls, utils, dom, ui) {
    var dh = {};
    var app = null; //TODO remove

    dh.setup = function() {
        //TODO remove
        app = require('kloudspeaker/instance');
    }

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
        ui.handlers.localize(dlg);
        dlg.find("#kloudspeaker-info-dialog-close-button").click(function() { dlg.dialog('destroy'); dlg.remove(); });*/
    };

    dh.showActionDeniedMessage = function(title, reasons) {
        //TODO template
        var msg = '<p>' + title + '</p><p><ul>';
        for (var i = 0, j = reasons.length; i < j; i++) {
            msg = msg + "<li>" + reasons[i] + "</li>";
        }
        msg = msg + "</ul></p>";
        dh.error({
            title: loc.get('errorDialogTitle'),
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
            title: loc.get('errorDialogTitle'),
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
        if (!loc.has(msg)) msg = 'errorDialogUnknownError';
        var s = session.get();
        if (s.user && s.user.admin && error.trace) {
            dh.custom({
                title: loc.get('errorDialogTitle'),
                content: $("#kloudspeaker-tmpl-dialog-error-debug").tmpl({
                    title: loc.get('errorDialogTitle'),
                    message: loc.get(msg),
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
            dh.error({
                title: loc.get('errorDialogTitle'),
                message: loc.get(msg)
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
                table = controls.table($table, {
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
            $.each(utils.getKeys(spec.options), function(i, k) {
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
        var w = dom.template("kloudspeaker-tmpl-wait", $.extend(spec, dh._dialogDefaults)).appendTo($trg).show();
        return {
            close: function() {
                w.remove();
            }
        };
    };

    dh.notification = function(spec) {
        if (app.activeView && app.activeView.onNotification && app.activeView.onNotification(spec)) return;

        var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#" + spec.target) : spec.target) : $("#kloudspeaker-notification-container, .kloudspeaker-notification-container").first();
        if ($trg.length === 0) $trg = $("body");
        var notification = dom.template("kloudspeaker-tmpl-notification", $.extend(spec, dh._dialogDefaults)).hide().appendTo($trg);
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
        if (s['title-key']) s.title = loc.get(s['title-key']);

        var getButtonTitle = function(b) {
            if (b.title) return b.title;
            if (b["title-key"]) return loc.get(b["title-key"]);
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
                if (spec.html || spec.content) ui.handlers.localize($dlg);
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
            ui.handlers.localize($dlg);
            _onDialogReady();
        } else if (spec.model) {
            ui.viewmodel(spec.view, spec.model, $body).done(function(m) {
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
            fs.items(parent, spec.allowFiles, spec.allRoots).done(function(r) {
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
        dh.custom({
            resizable: true,
            initSize: [600, 400],
            title: o.title,
            content: dom.template("kloudspeaker-tmpl-tableview"),
            buttons: o.buttons,
            "on-button": function(btn, d) {
                o.onButton(btn, d);
            },
            "on-show": function(h, $d) {
                var $content = $d.find("#kloudspeaker-tableview-content");

                h.center();
                var table = controls.table("kloudspeaker-tableview-list", {
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
    return dh;
});
