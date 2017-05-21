define(['kloudspeaker/session', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/permissions', 'kloudspeaker/localization', 'kloudspeaker/ui/formatters', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/templates', 'kloudspeaker/ui/controls', 'kloudspeaker/events'], function(session, plugins, service, permissions, loc, formatters, utils, dom, templates, controls, events) {
    console.log('comments');
    //TODO rewrite using viewmodel
    /*var that = {};

    that.initialize = function() {
        dom.importCss(plugins.url("Comment", "style.css"));

        events.on('localization/init', function() {
            that._timestampFormatter = new formatters.Timestamp(loc.get('shortDateTimeFormat'));
        });
    };

    that.getListCellContent = function(item, data) {
        if (!item.id || item.id.length === 0 || !data || !data["plugin-comment-count"]) return "";
        var counts = data["plugin-comment-count"];

        if (!counts[item.id])
            return "<div id='item-comment-count-" + item.id + "' class='filelist-item-comment-count-none'></div>";

        return "<div id='item-comment-count-" + item.id + "' class='filelist-item-comment-count'>" + counts[item.id] + "</div>";
    };

    that.renderItemContextDetails = function(el, item, ctx, $content, data) {
        $content.addClass("loading");
        templates.load("comments-content", utils.noncachedUrl(plugins.url("Comment", "content.html"))).done(function() {
            $content.removeClass("loading");
            if (data.count === 0) {
                that.renderItemContextComments(el, item, ctx, [], {
                    element: $content.empty(),
                    contentTemplate: 'comments-template'
                });
            } else {
                that.loadComments(item, false, function(item, comments) {
                    that.renderItemContextComments(el, item, ctx, comments, {
                        element: $content.empty(),
                        contentTemplate: 'comments-template'
                    });
                });
            }
        });
    };

    that.renderItemContextComments = function(el, item, ctx, comments, o) {
        var s = session.get();
        var canAdd = ((s.user && s.user.admin) || permissions.hasFilesystemPermission(item, "comment_item"));
        var $c = dom.template(o.contentTemplate, {
            item: item,
            canAdd: canAdd
        }).appendTo(o.element);

        if (canAdd)
            $c.find(".comments-dialog-add").click(function() {
                var comment = $c.find(".comments-dialog-add-text").val();
                if (!comment || comment.length === 0) return;
                that.onAddComment(item, comment, el.close);
            });

        that.updateComments($c.find(".comments-list"), item, comments);
    };

    that.showCommentsBubble = function(item, e, ctx) {
        var bubble = controls.dynamicBubble({
            element: e,
            title: item.name,
            container: ctx.container
        });

        templates.load("comments-content", utils.noncachedUrl(plugins.url("Comment", "content.html"))).done(function() {
            that.loadComments(item, true, function(item, comments, permission) {
                var s = session.get();
                var canAdd = (s.user && s.user.admin) || permission == '1';
                var $c = dom.template("comments-template", {
                    item: item,
                    canAdd: canAdd
                });
                bubble.content($c);

                if (canAdd)
                    $c.find(".comments-dialog-add").click(function() {
                        var comment = $c.find(".comments-dialog-add-text").val();
                        if (!comment || comment.length === 0) return;
                        that.onAddComment(item, comment, bubble.close);
                    });

                that.updateComments($c.find(".comments-list"), item, comments);
            });
        });
    };

    that.loadComments = function(item, permission, cb) {
        service.get("comment/" + item.id + (permission ? '?p=1' : '')).done(function(r) {
            cb(item, that.processComments(permission ? r.comments : r), permission ? r.permission : undefined);
        });
    };

    that.processComments = function(comments) {
        var s = session.get();
        var userId = s.user_id;

        for (var i = 0, j = comments.length; i < j; i++) {
            comments[i].time = that._timestampFormatter.format(utils.parseInternalTime(comments[i].time));
            comments[i].comment = comments[i].comment.replace(new RegExp('\n', 'g'), '<br/>');
            comments[i].remove = (s.user && s.user.admin) || (userId == comments[i].user_id);
        }
        return comments;
    };

    that.onAddComment = function(item, comment, cb) {
        service.post("comment/" + item.id, {
            comment: comment
        }).done(function(result) {
            that.updateCommentCount(item, result.count);
            if (cb) cb();
        });
    };

    that.onRemoveComment = function($list, item, id) {
        service.del("comment/" + item.id + "/" + id).done(function(result) {
            that.updateCommentCount(item, result.length);
            that.updateComments($list, item, that.processComments(result));
        });
    };

    that.updateCommentCount = function(item, count) {
        var e = document.getElementById("item-comment-count-" + item.id);
        if (!e) return;

        if (count < 1) {
            e.innerHTML = '';
            e.setAttribute('class', 'filelist-item-comment-count-none');
        } else {
            e.innerHTML = count;
            e.setAttribute('class', 'filelist-item-comment-count');
        }
    };

    that.updateComments = function($list, item, comments) {
        $list.removeClass("loading");

        if (comments.length === 0) {
            $list.html("<span class='message'>" + loc.get("commentsDialogNoComments") + "</span>");
            return;
        }

        dom.template("comment-template", comments).appendTo($list.empty());
        $list.find(".comment-content").hover(
            function() {
                $(this).addClass("hover");
            },
            function() {
                $(this).removeClass("hover");
            }
        );
        $list.find(".comment-remove-action").click(function(e) {
            e.preventDefault();
            var comment = $(this).tmplItem().data;
            that.onRemoveComment($list, item, comment.id);
        });
    };

    plugins.register({
        id: "plugin-comment",
        initialize: that.initialize,
        fileViewHandler: {
            filelistColumns: function() {
                return [{
                    "id": "comment-count",
                    "request-id": "plugin-comment-count",
                    "title-key": "",
                    "width": 50,
                    "content": that.getListCellContent,
                    "request": function(parent) {
                        return {};
                    },
                    "on-click": function(item, data, ctx) {
                        that.showCommentsBubble(item, $("#item-comment-count-" + item.id), ctx);
                    }
                }];
            }
        },
        itemContextHandler: function(item, ctx, data) {
            return {
                details: {
                    "title-key": "pluginCommentContextTitle",
                    "on-render": function(el, $content, ctx) {
                        that.renderItemContextDetails(el, item, ctx, $content, data);
                    }
                }
            };
        }
    });*/
});
