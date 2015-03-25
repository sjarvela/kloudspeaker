define(['kloudspeaker/config/users/repository', 'knockout'], function(repository, ko) {
    var onAddUser = function() {
        alert('add');
    };
    
    var model = {
        users: ko.observableArray([]),
        user: ko.observable(null),
        tools: [{
            id: 'add',
            action: onAddUser
        }],
        cols: [{
            id: 'id'
        }, {
            id: 'name'
        }, {
            id: 'remove',
            type: 'action',
            action: function(u) {
                alert(u.name);
            }
        }]
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
