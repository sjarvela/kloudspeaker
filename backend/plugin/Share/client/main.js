define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/filesystem', 'kloudspeaker/ui/views', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'kloudspeaker/dom'], function(app, settings, plugins, fs, views, formatters, dialogs, texts, utils, dom) {
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
                    model: ["kloudspeaker/share/views/public/access_password", {
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
        model: 'kloudspeaker/share/views/config/manage'
    });

    views.registerConfigView({
        viewId: 'allshares',
        title: 'i18n:pluginShareConfigViewNavTitle',
        model: 'kloudspeaker/share/views/config/manage-admin',
        admin: true
    });

    this._getShareView = function(id, info) {
        if (info.type == "download") {
            return {
                model: ["kloudspeaker/share/views/public/download", {
                    id: id,
                    name: info.name
                }]
            };
        } else if (info.type == "prepared_download") {
            return {
                model: ["kloudspeaker/share/views/public/prepared_download", {
                    id: id,
                    name: info.name
                }]
            };
        } else {
            return {
                model: ["kloudspeaker/share/views/public/upload", {
                    id: id,
                    name: info.name
                }]
            };
        }
        return new kloudspeaker.ui.FullErrorView(texts.get('shareViewInvalidRequest'));
    };

    this.onOpenItemShares = function(item) {
        return dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            model: ['kloudspeaker/share/views/list', {
                item: item
            }],
            buttons: [{
                id: "no",
                "title": texts.get('dialogCancel')
            }],
        });
    };

    this.onAddShare = function(item) {
        return dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            model: ['kloudspeaker/share/views/addedit', {
                item: item
            }],
            buttons: [{
                id: "yes",
                "title": texts.get('dialogSave')
            }, {
                id: "no",
                "title": texts.get('dialogCancel')
            }],
        });
    };

    this.onEditShare = function(share) {
        return dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            model: ['kloudspeaker/share/views/addedit', {
                share: share
            }],
            buttons: [{
                id: "yes",
                "title": texts.get('dialogSave')
            }, {
                id: "no",
                "title": texts.get('dialogCancel')
            }],
        });
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

    views.registerFileViewHandler({
        filelistColumns: function() {
            return [{
                "id": "share-info",
                "request-id": "plugin-share-info",
                "title-key": "",
                "content": function(item, data) {
                    if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return "";
                    var itemData = data["plugin-share-info"][item.id];
                    if (!itemData) return "<div class='filelist-item-share-info empty'></div>";
                    if (itemData.own > 0)
                        return "<div class='filelist-item-share-info'><i class='icon-external-link'></i>&nbsp;" + itemData.own + "</div>";
                    return "<div class='filelist-item-share-info others' title='" + texts.get("pluginShareFilelistColOtherShared") + "'><i class='icon-external-link'></i></div>";
                },
                "request": function(parent) {
                    return {};
                },
                "on-click": function(item, data) {
                    if (!item.id || item.id.length === 0 || !data || !data["plugin-share-info"]) return;
                    var itemData = data["plugin-share-info"][item.id];
                    if (!itemData) return;

                    if (itemData.own > 0)
                        this.showBubble({
                            model: ['kloudspeaker/share/views/list', {
                                item: item
                            }],
                            title: item.name
                        });
                }
            }];
        }
    });

    dom.importCss(plugins.url('Share', 'style/style.css'));

    //TODO extract module interface for 1) item context handlers 2) action validators
    plugins.register({
        id: "plugin-share",
        backendPluginId: "Share",

        itemContextHandler: function(item, ctx, data) {
            if (!fs.hasPermission(item, "share_item")) return false;

            return {
                actions: [{
                    id: 'pluginShare',
                    'title-key': 'itemContextShareMenuTitle',
                    icon: 'external-link',
                    callback: function() {
                        that.onOpenItemShares(item);
                    }
                }]
            };
        },

        actionValidationHandler: function() {
            return {
                getValidationMessages: that.getActionValidationMessages
            }
        },

        openShares: that.onOpenItemShares,
    });

    return {
        getShareUrl: function(id, path, param) {
            var url = service.url("public/" + id, true);
            if (path) url = url + path;
            if (param) url = utils.urlWithParam(url, param);
            return utils.noncachedUrl(url);
        },
        getShareView: that._getShareView,
        openItemShares: that.onOpenItemShares,
        addShare: that.onAddShare,
        editShare: that.onEditShare
    }
});
