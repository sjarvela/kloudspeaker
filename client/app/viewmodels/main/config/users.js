define(['kloudspeaker/config/users/repository', 'knockout'], function(repository, ko) {
    var model = {
        users: ko.observableArray([]),
        user: ko.observable(null),
        cols: [
        	{ id: 'id' },
        	{ id: 'name' }
        ]
    };

    var reload = function() {
        repository.getAllUsers().done(function(u) {
            model.users(u);
        });
    };

    return {
        activate: function(id) {
            console.log("config/users/" + id);
            reload();
            if (id != null) repository.getUser(id).done(function(u) {
                model.user(u);
            });
            return true;
        },
        selectUser: function(u) {
        	//TODO url?
            model.user(u);
        },
        model: model
    };
});
