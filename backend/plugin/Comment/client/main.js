define(['kloudspeaker/config', 'kloudspeaker/localization', 'kloudspeaker/dom', 'kloudspeaker/resources', 'kloudspeaker/plugins', 'kloudspeaker/ui/files'], function(config, loc, dom, res, plugins, uif) {
    console.log('kloudspeaker/comments');

    loc.addNamespace("comments", res.getPluginUrl('Comment'));
    dom.importCss(res.getPluginUrl('Comment', 'client/css/style.css'));

    uif.itemDetails.registerProvider({
        id: "comments",
        get: function(item, d, pd) {
            if (!plugins.exists("Comment")) return false;

            return {
                titleKey: "comments:iteminfo.title",
                module: 'kloudspeaker/comments/iteminfo',
            }
        },
        getRequestData: function(item) {
            return {};
        }
    });
});

define('kloudspeaker/comments/repository', ['kloudspeaker/service'], function(service) {
    var cs = service.get("comment/");
    return {
        getCommentsForItem: function(item) {
            return cs.get(item.id); //TODO "items/n/"
        },
        addItemComment: function(item, comment) {
            return cs.post(item.id, { //TODO "items/n/"
                comment: comment
            });
        },
        editComment: function(id, newComment) {
            return cs.put(id, {
                comment: newComment
            });
        },
        removeItemComment: function(item, comment) {
            return cs.del("items/" + item.id + "/" + comment.id);
        }
    };
});
