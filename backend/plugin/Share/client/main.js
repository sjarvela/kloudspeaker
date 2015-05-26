define(['kloudspeaker/app', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/ui/views', 'kloudspeaker/events', 'kloudspeaker/ui', 'kloudspeaker/ui/dnd', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/ui/uploader', 'kloudspeaker/ui/clipboard'], function(app, plugins, service, session, fs, views, events, ui, dnd, formatters, controls, dialogs, texts, utils, dom, uploader, clipboard) {
    //TODO
    // - break into modules (1. config view, 2. edit dialog, 3. share full views (download, upload, prepared download) etc)
    var that = this;

    this.initialize = function() {
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
                        df.resolve(false);
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
    };

    this._getShareView = function(id, info) {
        var serviceUrl = service.url("public/" + id, true);
        var urlProvider = {
            get: function(path, param) {
                var url = serviceUrl;
                if (path) url = url + path;
                if (param) url = utils.urlWithParam(url, param);
                return utils.noncachedUrl(url);
            }
        }

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
            $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").set(utils.parseInternalTime(share.expiration));

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

    this.onActivateConfigView = function($c, cv) {
        var shares = false;
        var items = false;
        var invalid = [];
        var listView = false;

        var updateShares = function() {
            cv.showLoading(true);

            that.loadShares().done(function(l) {
                shares = l.shares[session.get().user.id];
                invalid = l.invalid;

                items = [];
                $.each(utils.getKeys(l.items), function(i, k) {
                    items.push(l.items[k]);
                });
                $.each(l.nonfs, function(i, itm) {
                    items.push({
                        id: itm.id,
                        name: itm.name,
                        customType: itm.type
                    });
                });

                listView.table.set(items);

                cv.showLoading(false);
            });
        };
        var isValid = function(i) {
            if (invalid.length === 0) return true;
            return (invalid.indexOf(i.id) < 0);
        };

        listView = new kloudspeaker.view.ConfigListView($c, {
            table: {
                key: "id",
                columns: [{
                    id: "icon",
                    title: "",
                    valueMapper: function(item) {
                        if (item.customType) return ""; //TODO type icon
                        return isValid(item) ? '<i class="icon-file"></i>' : '<i class="icon-exclamation"></i>';
                    }
                }, {
                    id: "name",
                    title: texts.get('fileListColumnTitleName')
                }, {
                    id: "path",
                    title: texts.get('pluginShareConfigViewPathTitle'),
                    formatter: function(item) {
                        if (item.customType || !item.path) return "";
                        var p = (fs.rootsById[item.root_id] ? fs.rootsById[item.root_id].name : item.root_id) + ":";
                        var path = item.path.substring(0, item.path.length - (item.name.length + (item.is_file ? 0 : 1)));
                        return p + "/" + path;
                    }
                }, {
                    id: "count",
                    title: texts.get('pluginShareConfigViewCountTitle'),
                    formatter: function(item) {
                        return shares[item.id].length;
                    }
                }, {
                    id: "edit",
                    title: "",
                    type: "action",
                    formatter: function(item) {
                        return isValid(item) ? '<i class="icon-edit"></i>' : '';
                    }
                }, {
                    id: "remove",
                    title: "",
                    type: "action",
                    content: '<i class="icon-trash"></i>'
                }],
                onRow: function($r, item) {
                    if (!isValid(item)) $r.addClass("error");
                },
                onRowAction: function(id, item) {
                    if (id == "edit") {
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
                    } else if (id == "remove") {
                        that.removeAllItemShares(item).done(updateShares);
                    }
                }
            }
        });
        updateShares();
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

    this.onActivateConfigAdminView = function($c, cv) {
        var pathFormatter = new formatters.FilesystemItemPath();

        kloudspeaker.templates.load("shares-content", utils.noncachedUrl(plugins.url("Share", "content.html"))).done(function() {
            service.get("configuration/users").done(function(l) {
                var users = that.processUserData(l);

                var shares = false;
                var items = false;
                var invalid = [];
                var nonfs = [];
                var listView = false;

                var getQueryParams = function(i) {
                    var user = $optionUser.get();
                    var item = $optionItem.get();

                    var params = {};
                    if (user) params.user_id = user.id;
                    if (item) {
                        params.item = item;

                        if (item == 'filesystem_item' || item == 'filesystem_child') {
                            if (selectedItem)
                                params.item_id = selectedItem.id;
                            else
                                params.item_id = null;
                        }
                    }

                    return params;
                };

                var refresh = function() {
                    cv.showLoading(true);
                    listView.table.refresh().done(function() {
                        cv.showLoading(false);
                    });
                };

                var currentTime = utils.formatInternalTime(new Date());

                listView = new kloudspeaker.view.ConfigListView($c, {
                    actions: [{
                        id: "action-remove",
                        content: '<i class="icon-trash"></i>',
                        cls: "btn-danger",
                        depends: "table-selection",
                        callback: function(sel) {
                            dialogs.confirmation({
                                title: texts.get("pluginShareConfigRemoveShareTitle"),
                                message: texts.get("pluginShareConfigRemoveShareMessage", [sel.length]),
                                callback: function() {
                                    service.del("share/list/", {
                                        list: utils.extractValue(sel, "id")
                                    }).done(refresh);
                                }
                            });
                        }
                    }, {
                        id: "action-activate",
                        content: '<i class="icon-check"></i>',
                        depends: "table-selection",
                        tooltip: texts.get('pluginShareConfigViewShareActivate'),
                        callback: function(sel) {
                            service.put("share/list/", {
                                ids: utils.extractValue(sel, "id"),
                                active: true
                            }).done(refresh);
                        }
                    }, {
                        id: "action-deactivate",
                        content: '<i class="icon-check-empty"></i>',
                        depends: "table-selection",
                        tooltip: texts.get('pluginShareConfigViewShareDeactivate'),
                        callback: function(sel) {
                            service.put("share/list/", {
                                ids: utils.extractValue(sel, "id"),
                                active: false
                            }).done(refresh);
                        }
                    }, {
                        id: "action-refresh",
                        content: '<i class="icon-refresh"></i>',
                        callback: refresh
                    }],
                    table: {
                        key: "id",
                        narrow: true,
                        remote: {
                            path: "share/query",
                            paging: {
                                max: 50
                            },
                            queryParams: getQueryParams,
                            onData: function(l) {
                                shares = l.data;
                                invalid = l.invalid;
                                nonfs = l.nonfs;
                                items = l.items;

                                $.each(l.nonfs, function(i, itm) {
                                    items[itm.id] = {
                                        id: itm.id,
                                        name: itm.name,
                                        customType: itm.type
                                    };
                                });
                            },
                            onLoad: function(pr) {
                                $c.addClass("loading");
                                pr.done(function(r) {
                                    $c.removeClass("loading");
                                });
                            }
                        },
                        onRow: function($r, s) {
                            if (s.invalid) $r.addClass("error");
                            if (s.expiration && s.expiration <= currentTime) $r.addClass("warning");
                            if (s.active != "1") $r.addClass("inactive");
                        },
                        columns: [{
                            type: "selectrow"
                        }, {
                            id: "icon",
                            title: "",
                            valueMapper: function(s) {
                                if (items[s.item_id].customType) return ""; //TODO type icon
                                return s.invalid ? '<i class="icon-exclamation"></i>' : '<i class="icon-file"></i>';
                            }
                        }, {
                            id: "restriction",
                            title: "",
                            formatter: function(s) {
                                if (s.restriction == 'private') return '<i class="icon-user" title="' + texts.get('shareDialogShareAccessLoggedInTitle') + '" />';
                                else if (s.restriction == 'pw') return '<i class="icon-lock" title="' + texts.get('shareDialogShareAccessPasswordTitle').replace(':', '') + '" />';
                                else return '<i class="icon-globe" title="' + texts.get('shareDialogShareAccessNoRestrictionTitle') + '" />';
                            }
                        }, {
                            id: "user_id",
                            title: texts.get('pluginShareConfigViewUserTitle'),
                            formatter: function(s) {
                                return users.usersById[s.user_id].name;
                            }
                        }, {
                            id: "name",
                            title: texts.get('pluginShareConfigViewShareNameTitle')
                        }, {
                            id: "item_name",
                            title: texts.get('pluginShareConfigViewItemNameTitle'),
                            valueMapper: function(s) {
                                if (s.invalid) return ""; //TODO
                                return items[s.item_id].name;
                            }
                        }, {
                            id: "path",
                            title: texts.get('pluginShareConfigViewPathTitle'),
                            formatter: function(s) {
                                if (s.invalid) return ""; //TODO

                                var item = items[s.item_id];
                                if (item.customType || !item.path) return "";

                                var p = (fs.rootsById[item.root_id] ? fs.rootsById[item.root_id].name : item.root_id) + ":";
                                var path = item.path.substring(0, item.path.length - (item.name.length + (item.is_file ? 0 : 1)));
                                return p + "/" + path;
                            }
                        }, {
                            id: "expiration",
                            title: texts.get('pluginShareConfigViewExpirationTitle'),
                            formatter: function(s) {
                                if (!s.expiration) return "";
                                return that._timestampFormatter.format(s.expiration);
                            }
                        }, {
                            id: "active",
                            title: texts.get('pluginShareConfigViewActiveTitle'),
                            formatter: function(s) {
                                if (s.active == "1") return '<i class="icon-check"/>';
                                else return '<i class="icon-check-empty"/>';
                            }
                        }, {
                            id: "edit",
                            title: "",
                            type: "action",
                            formatter: function(s) {
                                return s.invalid ? '' : '<i class="icon-edit"></i>';
                            }
                        }, {
                            id: "remove",
                            title: "",
                            type: "action",
                            content: '<i class="icon-trash"></i>'
                        }],
                        onRowAction: function(id, s) {
                            if (id == "edit") {
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
                                            refresh();
                                        }).fail(d.close);
                                    },
                                    "on-show": function(h, $d) {
                                        _editor = that._initShareEditor(s, $d);
                                    }
                                });
                            } else if (id == "remove") {
                                service.del("share/" + s.id).done(refresh);
                            }
                        }
                    }
                });
                var $options = $c.find(".kloudspeaker-configlistview-options");
                dom.template("kloudspeaker-tmpl-share-admin-options").appendTo($options);
                ui.process($options, ["localize"]);

                var $optionUser = controls.select("share-user", {
                    values: users.users,
                    title: "name",
                    none: texts.get('pluginShareAdminAny')
                });

                var $itemSelector = $("#share-filesystem-item-selector");
                var $itemSelectorValue = $("#share-filesystem-item-value");
                var selectedItem = false;
                var onSelectItem = function(i) {
                    selectedItem = i;
                    $itemSelectorValue.val(pathFormatter.format(i));
                };
                $("#share-filesystem-item-select").click(function(e) {
                    if ($optionItem.get() == 'filesystem_item') {
                        dialogs.itemSelector({
                            title: texts.get('pluginShareSelectItemTitle'),
                            message: texts.get('pluginShareSelectItemMsg'),
                            actionTitle: texts.get('ok'),
                            handler: {
                                onSelect: onSelectItem,
                                canSelect: function(f) {
                                    return true;
                                }
                            }
                        });
                    } else {
                        dialogs.folderSelector({
                            title: texts.get('pluginShareSelectFolderTitle'),
                            message: texts.get('pluginShareSelectFolderMsg'),
                            actionTitle: texts.get('ok'),
                            handler: {
                                onSelect: onSelectItem,
                                canSelect: function(f) {
                                    return true;
                                }
                            }
                        });
                    }
                    return false;
                });
                var $optionItem = controls.select("share-item", {
                    values: ['none', 'filesystem_item', 'filesystem_child'],
                    formatter: function(s) {
                        return texts.get('pluginShareAdminOptionItem_' + s);
                    },
                    none: texts.get('pluginShareAdminAny'),
                    onChange: function(s) {
                        if (s == 'filesystem_item' || s == 'filesystem_child') {
                            selectedItem = false;
                            $itemSelectorValue.val("");
                            $itemSelector.show();
                        } else {
                            $itemSelector.hide();
                        }
                    }
                });

                refresh();
            });
        });
    };

    plugins.register({
        id: "plugin-share",
        backendPluginId: "Share",
        resources: {
            css: true
        },
        initialize: that.initialize,

        configViewHandler: {
            views: function() {
                var views = [{
                    viewId: "shares",
                    title: texts.get("pluginShareConfigViewNavTitle"),
                    onActivate: that.onActivateConfigView
                }];

                if (session.get().user.admin) views.push({
                    viewId: "allshares",
                    admin: true,
                    title: texts.get("pluginShareConfigViewNavTitle"),
                    onActivate: that.onActivateConfigAdminView
                });

                return views;
            }
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
        getShareView: that._getShareView
    }
});
