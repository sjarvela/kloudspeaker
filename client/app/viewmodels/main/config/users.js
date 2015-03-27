define(['kloudspeaker/config/users/repository', 'kloudspeaker/ui', 'kloudspeaker/utils', 'knockout'], function(repository, ui, utils, ko) {
    var model = {
        user: ko.observable(null)
    };

    var listRefresh = utils.createNotifier();

    var onAddUser = function() {
        ui.dialogs.open({
            module: 'viewmodels/main/config/users/addedituser',
            view: 'views/main/config/users/addedituser'
        }).done(function(u) {
            repository.addUser(u).done(function() {
                listRefresh.trigger();
            });
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
            repository.editUser(u).done(function() {
                listRefresh.trigger();
            });
        });
    };

    var onRemoveUser = function(u) {
        repository.removeUser(u).done(function() {
            listRefresh.trigger();
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
            titleKey: 'main.config.list.id'
        }, {
            id: 'name',
            titleKey: 'user.name'
        }, {
            id: 'email',
            titleKey: 'user.email'
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
            handler: repository.query,
            refresh: listRefresh
        },
        model: model
    };
});
