define(['kloudspeaker/config/users/repository', 'knockout'], function(repository, ko) {
    var model = {
        users: ko.observableArray([]),
        user: ko.observable(null)
    };

    var onAddUser = function() {
        alert('add');
    };

    var onRemoveUser = function() {

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
        tools: [{
            id: 'add',
            icon: 'plus',
            action: onAddUser
        }],
        cols: [{
            id: 'id',
            titleKey: 'config.list.id'
        }, {
            id: 'name',
            titleKey: 'main.config.users.name'
        }, {
            id: 'remove',
            type: 'action',
            icon: 'trash',
            title: '',
            action: onRemoveUser
        }],
        model: model
    };
});
