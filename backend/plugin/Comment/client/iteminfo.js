define(['kloudspeaker/comments/repository', 'kloudspeaker/resources', 'knockout'], function(repository, res, ko) {
    var model = {
        item: null,
        list: null,
        comment: ko.observable(""),
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
