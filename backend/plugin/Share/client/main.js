define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/share/repository', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/ui/views', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/permissions'], function(settings, plugins, repository, service, fs, views, formatters, dialogs, texts, utils, dom, permissions) {
    var that = {};

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

    that._getShareView = function(id, info) {
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

    that.onOpenItemShares = function(item) {
        return dialogs.custom({
            resizable: true,
            initSize: [600, 470],
            model: ['kloudspeaker/share/views/list', {
                item: item
            }],
            buttons: [{
                id: "no",
                "title": texts.get('dialogCancel')
            }],
        });
    };

    var getDataObj = function(d, item) {
        if (!item || !item.id || item.id.length === 0) return false;
        if (!d || !d["plugin-share/item-info"]) return false;
        return d["plugin-share/item-info"][item.id];
    };
    var createDataWithOwn = function(d, item, own) {
        if (!item || !item.id || item.id.length === 0 || !d) return false;
        if (!d["plugin-share/item-info"]) d["plugin-share/item-info"] = {};
        if (!d["plugin-share/item-info"][item.id])
            d["plugin-share/item-info"][item.id] = {};
        d["plugin-share/item-info"][item.id].own = own;
    };

    that.onAddShare = function(item) {
        return dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            model: ['kloudspeaker/share/views/addedit', {
                item: item
            }]
        }).done(function() {
            var fv = views.getActiveFileView();
            if (fv) fv.updateData(function(d) {
                var itemData = getDataObj(d, item);
                if (!itemData)
                    createDataWithOwn(d, item, 1);
                else {
                    if (typeof(itemData.own) === 'string') itemData.own = (parseInt(itemData.own, 10));
                    itemData.own += 1; // add one
                }

                // refresh this item
                return [item];
            });
        });
    };

    that.onEditShare = function(share) {
        return dialogs.custom({
            resizable: true,
            initSize: [600, 400],
            model: ['kloudspeaker/share/views/addedit', {
                share: share
            }]
        });
    };

    that.onRemoveShare = function(item, share) {
        return repository.removeShare(share).done(function() {
            var fv = views.getActiveFileView();
            if (fv) fv.updateData(function(d) {
                var itemData = getDataObj(d, item);
                if (!itemData) return;

                if (typeof(itemData.own) === 'string') itemData.own = (parseInt(itemData.own, 10));
                itemData.own -= 1; // reduce one

                if (typeof(itemData.other) === 'string') itemData.other = (parseInt(itemData.other, 10));
                // if last was removed, remove data obj
                if (itemData.own <= 0 && !itemData.other) d["plugin-share/item-info"][item.id] = false;

                // refresh that item
                return [item];
            });
        });
    }

    that.getActionValidationMessages = function(action, items, validationData) {
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
                "title-key": "",
                "content": function(item, data) {
                    var itemData = getDataObj(data, item);

                    // no data or invalid item
                    if (itemData === false) return "";
                    // no item data found
                    if (!itemData) return "<div class='filelist-item-share-info empty'></div>";

                    if (itemData.own > 0)
                        return "<div class='filelist-item-share-info'><i class='icon-external-link'></i>&nbsp;" + itemData.own + "</div>";
                    return "<div class='filelist-item-share-info others' title='" + texts.get("pluginShareFilelistColOtherShared") + "'><i class='icon-external-link'></i></div>";
                },

                dataRequest: 'plugin-share/item-info',

                "on-click": function(item, data) {
                    if (!permissions.hasFilesystemPermission(item, "share_item")) return false;
                    
                    var itemData = getDataObj(data, item);
                    if (itemData === false) return;

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
            if (!permissions.hasFilesystemPermission(item, "share_item")) return false;

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
        editShare: that.onEditShare,
        removeShare: that.onRemoveShare
    }
});
