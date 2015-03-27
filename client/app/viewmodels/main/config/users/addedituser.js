define(['kloudspeaker/service', 'kloudspeaker/utils', 'kloudspeaker/localization', 'knockout'], function(service, utils, loc, ko) {
    return function() {
        console.log("addedit user init");

        var model = {
            edit: false,
            name: ko.observable(''),
            type: ko.observable(''),
            email: ko.observable(''),
            password: ko.observable(''),

            types: [{
                titleKey: 'main.config.users.addedituser.typeNormal',
                value: ''
            }, {
                titleKey: 'main.config.users.addedituser.typeAdmin',
                value: 'a'
            }]
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
                        titleKey: 'dialog.ok',
                        handler: onAddEdit
                    }, {
                        titleKey: 'dialog.cancel',
                        close: true
                    }]
                });
                return true;
            },
            generatePassword: function() {
                if (model.edit) return;
                model.password(utils.generatePassword());
            },
            model: model
        }
    };
});
