define(['kloudspeaker/app', 'kloudspeaker/share', 'kloudspeaker/share/repository', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'knockout'], function(app, share, repository, texts, utils, ko) {
    return function() {
        var that = this;
        var model = {
            item: null,

            items: ko.observableArray(null)
        };

        var refresh = function() {
            repository.getItemShares(model.item).done(function(list) {
                list.forEach(function(s) {
                    s._expanded = ko.observable(false);
                });
                model.items(list);
            });
        };

        return {
            model: model,
            onShow: function(container) {
                that._container = container;

                if (container.setTitle) {
                    var title = "";
                    if (model.item.shareTitle)
                        title = model.item.shareTitle;
                    else {
                        if (model.item.customType) {
                            // TODO register type handlers from plugins
                            if (model.item.customType == 'ic') title = texts.get("pluginItemCollectionShareTitle");
                        } else {
                            title = texts.get(model.item.is_file ? 'shareDialogShareFileTitle' : 'shareDialogShareFolderTitle');
                        }
                    }

                    container.setTitle(title);
                }
            },
            activate: function(params) {
                model.item = params.item;
                refresh();
            },
            getShareLink: function(s) {
                return app.getPageUrl("share/" + s.id);
            },

            onAddShare: function() {
                that._container.close();
                share.addShare(model.item);
            },
            onEditShare: function(s) {
                that._container.close();
                share.editShare(s);
            },
            onRemoveShare: function(s) {
                share.removeShare(model.item, s).done(refresh);
            },
            onCopyShareUrl: function() {}
        };
    };
});
/*
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
            that.onEditShare(share);
        });
        $(".share-remove").click(function(e) {
            var share = $(this).tmplItem().data;
            that.removeShare(item, share);
        });
    }
*/
