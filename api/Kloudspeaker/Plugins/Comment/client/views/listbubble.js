define(['kloudspeaker/plugins/comment/repository', 'kloudspeaker/localization', 'kloudspeaker/session', 'knockout'], function(repository, loc, session, ko) {
    return function() {
        var that = this;

        var model = {
            loading: ko.observable(true),
            canAdd: ko.observable(false),
            newComment: ko.observable(''),
            comments: ko.observableArray([])
        };

        return {
            activate: function(item) {
                that.item = item;
            },
            onShow: function(c) {
                that.container = c;

                repository.getAllCommentsForItem(that.item, true).done(function(l) {
                    model.comments(l.comments);
                    model.canAdd(l.permission.add);
                    model.loading(false);
                });
            },
            onAdd: function() {
                if (model.newComment().length == 0) return;
                repository.addCommentForItem(that.item, model.newComment());
                that.container.close();
            },
            model: model
        };
    }
});
