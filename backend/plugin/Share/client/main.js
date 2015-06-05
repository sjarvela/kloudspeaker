define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/ui/views', 'kloudspeaker/events', 'kloudspeaker/ui', 'kloudspeaker/ui/dnd', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/ui/uploader', 'kloudspeaker/ui/clipboard'], function(app, settings, plugins, service, session, fs, views, events, ui, dnd, formatters, controls, dialogs, texts, utils, dom, uploader, clipboard) {
    //TODO
    // - break into modules (1. config view, 2. edit dialog, 3. share list etc)
    var that = this;

    that._timestampFormatter = new formatters.Timestamp(texts.get('shortDateTimeFormat'));

    views.registerView("share", function(rqParts, urlParams) {
        if (rqParts.length != 2) return false;
        var df = $.Deferred();

        var shareId = rqParts[1];
        service.get("public/" + shareId + "/info/").done(function(result) {
            if (!result || !result.type || (["download", "upload", "prepared_download"].indexOf(result.type) < 0)) {
                df.resolve(new kloudspeaker.ui.FullErrorView(texts.get('shareViewInvalidRequest')));
                return;
            }

            if (result.restriction == "private") {
                var s = session.get();
                if (!s || !s.user) {
                    df.resolve(false); //forward to login page
                    return;
                }
            } else if (result.restriction == "pw" && !result.auth) {
                df.resolve({
                    model: ["kloudspeaker/share/views/access_password", {
                        id: shareId,
                        info: result
                    }]
                });
                return;
            }

            df.resolve(that._getShareView(shareId, result));
        }).fail(function() {
            df.resolve(new kloudspeaker.ui.FullErrorView(texts.get('shareViewInvalidRequest')));
        });
        return df.promise();
    });

    views.registerConfigView({
        viewId: 'shares',
        title: 'i18n:pluginShareConfigViewNavTitle',
        model: 'kloudspeaker/share/manage'
    });

    views.registerConfigView({
        viewId: 'allshares',
        title: 'i18n:pluginShareConfigViewNavTitle',
        model: 'kloudspeaker/share/manage-admin',
        admin: true
    });

    this._getShareView = function(id, info) {
        if (info.type == "download") {
            return {
                model: ["kloudspeaker/share/views/download", {
                    id: id,
                    name: info.name
                }]
            };
        } else if (info.type == "prepared_download") {
            return {
                model: ["kloudspeaker/share/views/prepared_download", {
                    id: id,
                    name: info.name
                }]
            };
        } else {
            return {
                model: ["kloudspeaker/share/views/upload", {
                    id: id,
                    name: info.name
                }]
            };
        }
        return new kloudspeaker.ui.FullErrorView(texts.get('shareViewInvalidRequest'));
    };

    this.renderItemContextDetails = function(el, item, $content, data) {
        $content.addClass("loading");
        kloudspeaker.templates.load("shares-content", utils.noncachedUrl(plugins.url("Share", "content.html"))).done(function() {
            $content.removeClass("loading");
            dom.template("kloudspeaker-tmpl-shares", {
                item: item
            }).appendTo($content);
            that.loadShares(item).done(function(shares) {
                that.initContent(item, shares, $content);
            });
        });
    };

    this.loadShares = function(item) {
        if (!item) return service.get("share/all/");
        return service.get("share/items/" + item.id).done(function(result) {
            that.refreshShares(result);
        });
    };

    this.refreshShares = function(shares) {
        that.shares = shares;
        that.shareIds = [];

        for (var i = 0, j = that.shares.length; i < j; i++)
            that.shareIds.push(shares[i].id);
    };

    this.getShare = function(id) {
        return that.shares[that.shareIds.indexOf(id)];
    }

    this.initContent = function(item, shares, $c) {
        var title = item.shareTitle ? item.shareTitle : texts.get(item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle');
        $("#share-item-title").html(title);
        $("#share-item-name").html(item.name);
        $("#share-dialog-content").removeClass("loading");
        $("#share-new").click(function() {
            that.onAddShare(item);
        });
        that._context = controls.slidePanel($("#share-list"), {
            relative: true
        });

        that.updateShareList(item);
    };

    this.getShareLink = function(share) {
        return app.getPageUrl("share/" + share.id);
    };

    this.updateShareList = function(item) {
        $("#share-items").empty();

        if (that.shares.length === 0) {
            $("#share-items").html('<div class="no-share-items">' + texts.get("shareDialogNoShares") + '</div>');
            return;
        }

        var opt = {
            itemClass: function() {
                var c = "item-share";
                if (!this.data.active)
                    c = c + " inactive";
                if (!this.data.name || this.data.name.length === 0)
                    c = c + " unnamed";
                return c;
            },
            link: function() {
                return that.getShareLink(this.data);
            }
        };

        dom.template("share-template", that.shares, opt).appendTo("#share-items");
        ui.process($("#share-list"), ["localize"]);
        if (!clipboard) {
            $(".share-link-copy").hide();
        } else {
            var h = {
                onMouseOver: function($e, clip) {
                    clip.setHandCursor(true);
                    $e.addClass("hover");
                },
                onMouseOut: function($e) {
                    $e.removeClass("hover");
                }
            }
            $.each($(".share-link-copy"), function(i, e) {
                var share = $(e).tmplItem().data;
                clipboard.enableCopy($(e), that.getShareLink(share), h);
            });
        }

        $(".share-link-toggle").click(function() {
            var share = $(this).tmplItem().data;
            if (!share.active) return;

            var $link = $(this).parent();
            var $c = $link.parent().siblings(".share-link-content");
            var $share = $c.parent();

            $(".share-link-content").not($c).hide();
            $(".item-share").not($share).removeClass("active");

            $share.toggleClass("active");
            $c.slideToggle();
            return false;
        });
        $(".item-share").hover(function() {
                $(".item-share").removeClass("hover");
                $(this).addClass("hover");
            },
            function() {});
        $(".share-edit").click(function(e) {
            var share = $(this).tmplItem().data;
            that.onEditShare(item, share);
        });
        $(".share-remove").click(function(e) {
            var share = $(this).tmplItem().data;
            that.removeShare(item, share);
        });
    }

    this.openContextContent = function(toolbarId, contentTemplateId, tmplData) {
        /*var $c = $("#share-context").empty();*/
        var $c = that._context.getContentElement().empty();
        dom.template(contentTemplateId, tmplData).appendTo($c);

        that._context.show(false, 280);
        /*$("#share-context-container").animate({
            "top" : "18px"
        }, 500);*/
        return $c;
    }

    this.closeAddEdit = function() {
        that._context.hide();
        /*$("#share-context-container").animate({
            "top" : "300px"
        }, 500);*/
    }

    this.onAddShare = function(item) {
        var $c = that.openContextContent('add-share-title', 'share-context-addedit-template');
        that._initShareEditor(false, $c, {
            onEdit: function(v) {
                $("#share-items").empty().append('<div class="loading"/>')
                that.closeAddEdit();
                that.addShare(item, v.name || '', v.expiration, v.active, v.restriction);
            },
            onCancel: function() {
                that.closeAddEdit();
            }
        });
    };

    this.onEditShare = function(item, share) {
        var $c = that.openContextContent('edit-share-title', 'share-context-addedit-template', {
            edit: true
        });
        that._initShareEditor(share, $c, {
            onEdit: function(v) {
                $("#share-items").empty().append('<div class="loading"/>')
                that.closeAddEdit();
                that.editShare(share.id, v.name || '', v.expiration, v.active, v.restriction).done(function(result) {
                    var s = that.getShare(share.id);
                    s.name = v.name;
                    s.active = v.active;
                    s.expiration = utils.formatInternalTime(v.expiration);
                    s.restriction = v.restriction ? v.restriction.type : false;
                    that.updateShareList(item);
                }).fail(that.d.close);
            },
            onCancel: function() {
                that.closeAddEdit();
            }
        });
    }

    this._initShareEditor = function(share, $c, o) {
        ui.process($c, ["localize"]);
        controls.datepicker("share-validity-expirationdate-value", {
            format: texts.get('shortDateTimeFormat'),
            time: true
        });

        $("#share-general-name").val(share ? share.name : '');
        $("#share-general-active").attr("checked", share ? share.active : true);

        var oldRestrictionPw = (share ? share.restriction == 'pw' : false);
        if (share) {
            if (share.restriction == 'pw')
                $("#share-access-public-password").attr('checked', true);
            else if (share.restriction == 'private')
                $("#share-access-private-loggedin").attr('checked', true);
            else
                $("#share-access-norestriction").attr('checked', true);
        } else
            $("#share-access-norestriction").attr('checked', true);

        if (share && share.expiration)
            $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").set((typeof(share.expiration) === 'string') ? utils.parseInternalTime(share.expiration) : share.expiration);

        if (oldRestrictionPw) $("#share-access-public-password-value").attr("placeholder", texts.get("shareDialogShareAccessChangePwTitle"));
        else $("#share-access-public-password-value").attr("placeholder", texts.get("shareDialogShareAccessEnterPwTitle"));

        var getValues = function() {
            var name = $("#share-general-name").val();
            var active = $("#share-general-active").is(":checked");
            var expiration = $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").get();

            var restriction = false;
            if ($("#share-access-private-loggedin").is(":checked")) restriction = {
                type: "private"
            };
            else if ($("#share-access-public-password").is(":checked")) {
                var value = $("#share-access-public-password-value").val();
                if (!oldRestrictionPw && (!value || value.length === 0)) {
                    $("#share-access-public-password-value").addClass("error");
                    return false;
                }
                restriction = {
                    type: "pw",
                    value: value
                };
            }

            return {
                name: name,
                expiration: expiration,
                active: active,
                restriction: restriction
            };
        }
        $("#share-addedit-btn-ok").click(function() {
            var v = getValues();
            if (!v) return;
            o.onEdit(v);
        });

        $("#share-addedit-btn-cancel").click(function() {
            o.onCancel();
        });

        return {
            getValues: getValues
        }
    };

    this.onOpenShares = function(item) {
        kloudspeaker.templates.load("shares-content", utils.noncachedUrl(plugins.url("Share", "content.html"))).done(function() {
            dialogs.custom({
                resizable: true,
                initSize: [600, 470],
                title: item.shareTitle ? item.shareTitle : texts.get(item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle'),
                content: dom.template("kloudspeaker-tmpl-shares", {
                    item: item,
                    bubble: false
                }),
                buttons: [{
                    id: "no",
                    "title": texts.get('dialogClose')
                }],
                "on-button": function(btn, d) {
                    d.close();
                    that.d = false;
                },
                "on-show": function(h, $d) {
                    that.d = h;
                    that.loadShares(item).done(function(shares) {
                        that.initContent(item, shares, $d);
                    });
                }
            });
        });
    };

    this.addShare = function(item, name, expiration, active, restriction) {
        return service.post("share/", {
            item: item.id,
            name: name,
            expiration: utils.formatInternalTime(expiration),
            active: active,
            restriction: restriction
        }).done(function(result) {
            that.refreshShares(result);
            that.updateShareList(item);
        }).fail(that.d.close);
    }

    this.editShare = function(id, name, expiration, active, restriction) {
        return service.put("share/" + id, {
            id: id,
            name: name,
            expiration: utils.formatInternalTime(expiration),
            active: active,
            restriction: restriction
        });
    }

    this.removeShare = function(item, share) {
        return service.del("share/" + share.id).done(function(result) {
            var i = that.shareIds.indexOf(share.id);
            that.shareIds.splice(i, 1);
            that.shares.splice(i, 1);
            that.updateShareList(item);
        }).fail(that.d.close);
    }

    this.removeAllItemShares = function(item) {
        return service.del("share/items/" + item.id);
    }

    this.getActionValidationMessages = function(action, items, validationData) {
        var messages = [];
        $.each(items, function(i, itm) {
            var msg;
            if (itm.reason == 'item_shared') msg = texts.get("pluginShareActionValidationDeleteShared", itm.item.name);
            else if (itm.reason == 'item_shared_others') msg = texts.get("pluginShareActionValidationDeleteSharedOthers", itm.item.name);
            else return;

            messages.push({
                message: msg,
                acceptable: itm.acceptable,
                acceptKey: itm.acceptKey
            });
        });
        return messages;
    }

    this.getListCellContent = function(item, data) {
        if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return "";
        var itemData = data["plugin-share-info"][item.id];
        if (!itemData) return "<div id='item-share-info-" + item.id + "' class='filelist-item-share-info empty'></div>";
        if (itemData.own > 0)
            return "<div id='item-share-info-" + item.id + "' class='filelist-item-share-info'><i class='icon-external-link'></i>&nbsp;" + itemData.own + "</div>";
        return "<div id='item-share-info-" + item.id + "' class='filelist-item-share-info others' title='" + texts.get("pluginShareFilelistColOtherShared") + "'><i class='icon-external-link'></i></div>";
    };

    this._updateListCellContent = function(item, data) {};

    this.showShareBubble = function(item, cell) {
        that.d = controls.dynamicBubble({
            element: cell,
            title: item.name,
            container: $("#kloudspeaker-filelist-main")
        });

        kloudspeaker.templates.load("shares-content", utils.noncachedUrl(plugins.url("Share", "content.html"))).done(function() {
            that.d.content(dom.template("kloudspeaker-tmpl-shares", {
                item: item,
                bubble: true
            }));
            that.loadShares(item).done(function(shares) {
                that.initContent(item, shares, that.d.element());
                that.d.position();
            });
        });
    };

    this.processUserData = function(l) {
        var userData = {
            users: [],
            groups: [],
            all: [],
            usersById: {}
        };
        for (var i = 0, j = l.length; i < j; i++) {
            var u = l[i];
            if (u.is_group == "0") {
                userData.users.push(u);
                userData.all.push(u);
                userData.usersById[u.id] = u;
            } else {
                userData.groups.push(u);
                userData.all.push(u);
                userData.usersById[u.id] = u;
            }
        }
        return userData;
    };

    plugins.register({
        id: "plugin-share",
        backendPluginId: "Share",
        resources: {
            css: true
        },

        fileViewHandler: {
            filelistColumns: function() {
                return [{
                    "id": "share-info",
                    "request-id": "plugin-share-info",
                    "title-key": "",
                    "content": that.getListCellContent,
                    "request": function(parent) {
                        return {};
                    },
                    "on-click": function(item, data) {
                        if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return;
                        var itemData = data["plugin-share-info"][item.id];
                        if (!itemData) return;

                        if (itemData.own > 0)
                            that.showShareBubble(item, $("#item-share-info-" + item.id));
                    }
                }];
            }
        },
        itemContextHandler: function(item, ctx, data) {
            if (!fs.hasPermission(item, "share_item")) return false;

            return {
                actions: [{
                    id: 'pluginShare',
                    'title-key': 'itemContextShareMenuTitle',
                    icon: 'external-link',
                    callback: function() {
                        that.onOpenShares(item);
                    }
                }]
            };
        },

        actionValidationHandler: function() {
            return {
                getValidationMessages: that.getActionValidationMessages
            }
        },

        openShares: that.onOpenShares,
    });

    return {
        getShareUrl: function(id, path, param) {
            var url = service.url("public/" + id, true);
            if (path) url = url + path;
            if (param) url = utils.urlWithParam(url, param);
            return utils.noncachedUrl(url);
        },
        getShareView: that._getShareView,
        openItemShares: function(item) {
            var shareTitle = false;
            if (item.customType) {
                // TODO register type handlers from plugins
                if (item.customType == 'ic') shareTitle = texts.get("pluginItemCollectionShareTitle");
            }
            that.onOpenShares({
                id: item.id,
                name: item.name,
                shareTitle: shareTitle,
                is_file: item.is_file
            });
        },
        editShare: function(s) {
            var df = $.Deferred();
            kloudspeaker.templates.load("shares-content", utils.noncachedUrl(kloudspeaker.plugins.url("Share", "content.html"))).done(function() {
                var _editor = false;

                dialogs.custom({
                    resizable: true,
                    initSize: [600, 400],
                    title: s.id, //TODO
                    content: dom.template("share-context-addedit-template", {
                        editDialog: true
                    }),
                    buttons: [{
                        id: "yes",
                        "title": texts.get('dialogSave')
                    }, {
                        id: "no",
                        "title": texts.get('dialogCancel')
                    }],
                    "on-button": function(btn, d) {
                        if (btn.id == 'no') {
                            d.close();
                            return;
                        }
                        var values = _editor.getValues();
                        that.editShare(s.id, values.name || '', values.expiration, values.active, values.restriction).done(function() {
                            d.close();
                            df.resolve();
                        }).fail(d.close);
                    },
                    "on-show": function(h, $d) {
                        _editor = that._initShareEditor(s, $d);
                    }
                });
            });
            return df;
        }
    }
});
