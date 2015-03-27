define(['kloudspeaker/config/users/repository', 'kloudspeaker/ui', 'knockout'], function(repository, ui, ko) {
    var model = {
        users: ko.observableArray([]),
        user: ko.observable(null)
    };

    var onAddUser = function() {
        ui.dialogs.open({
        	module: 'viewmodels/main/config/users/addedituser',
        	view: 'views/main/config/users/addedituser'
        }).done(function(u) {
        	alert(u.name);
        });
    };

    var onEditUser = function(u) {
        ui.dialogs.open({
        	module: 'viewmodels/main/config/users/addedituser',
        	view: 'views/main/config/users/addedituser',
        	param: {
        		user: u
        	}
        }).done(function(u) {
        	alert(u.name);
        });
    };

    var onRemoveUser = function(u) {

    };

    var reload = function() {
        repository.getAllUsers().done(function(u) {
            model.users(u);
        });
    };

    return {
        activate: function(id) {
            console.log("config/users/" + id);
            //reload();
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
            titleKey: 'config.users.list.name'
        }, {
            id: 'edit',
            type: 'action',
            icon: 'pencil',
            title: '',
            action: onEditUser
        }, {
            id: 'remove',
            type: 'action',
            icon: 'trash',
            title: '',
            action: onRemoveUser
        }],
        remote: {
        	handler: repository.query
        },
        model: model
    };
});
