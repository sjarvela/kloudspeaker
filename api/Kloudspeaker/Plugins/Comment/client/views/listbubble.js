define(['kloudspeaker/plugins/comment/repository', 'kloudspeaker/localization', 'knockout'], function(repository, loc, ko) {
    return function() {
        var that = this;

        var model = {
            loading: ko.observable(true),
            comments: ko.observableArray([])
        };

        return {
            activate: function(item) {
                console.log("comments act", item);
                repository.getAllCommentsForItem(item).done(function(l) {
                	model.comments(l);
                	model.loading(false);
                });
            },
            model: model
        };
    }
});
