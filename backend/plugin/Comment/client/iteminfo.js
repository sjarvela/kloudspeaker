define(['kloudspeaker/comments/repository', 'kloudspeaker/permissions', 'kloudspeaker/resources', 'knockout'], function(repository, permissions, res, ko) {
    var model = {
        item: null,
        list: null,
        comment: ko.observable(""),
        canAdd: ko.observable(false)
    };
    var reload = function() {
        repository.getCommentsForItem(model.item).done(function(c) {
            model.list(c);
        });
    };

    return {
        activate: function(p) {
            console.log("comments/iteminfo");
            var data = p.data();
            console.log(data);

            model.item = p.item();
            model.list = ko.observableArray([]);
            model.canAdd = permissions.hasFilesystemPermission(model.item, "comment_item");
            reload();
        },
        getView: function() {
            return res.getPluginUrl('Comment', 'client/views/iteminfo');
        },
        model: model,
        add: function() {
            var c = model.comment();
            if (!c) return;

            repository.addItemComment(model.item, c).done(function() {
                model.comment("");
                reload();
            })
        }
    };
});
