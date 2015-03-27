define(['kloudspeaker/service', 'knockout'], function(service, ko) {
    return function() {
        console.log("addedit user init");

        var model = {
            edit: false,
            name: ko.observable(''),
            email: ko.observable(''),
            password: ko.observable(''),
        }

        return {
            activate: function(d) {
                console.log("addedit user activate");
                console.log(d);

                var user = d.param ? d.param.user : null;

                if (user) {
                    model.edit = true;
                    model.name = user.name;
                    model.email = user.email;
                    //TODO
                }

                var onAddEdit = function() {
                    var user = {
                        name: model.name(),
                        email: model.email(),
                        password: model.password()
                    };
                    //TODO validate
                    if (user.name.length < 1 || user.password.length < 1) return;

                    d.done(user);
                };

                d.initModal({
                    titleKey: model.edit ? 'main.config.users.addedituser.titleEdit' : 'main.config.users.addedituser.titleAdd',
                    buttons: [{
                        titleKey: 'dialogs.ok',
                        handler: onAddEdit
                    }, {
                        titleKey: 'dialogs.cancel',
                        close: true
                    }]
                });
                return true;
            },
            model: model
        }
    };
});
