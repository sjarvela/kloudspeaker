define(['kloudspeaker/settings', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'knockout'], function(settings, utils, texts, ko) {
    return function() {
        var showLanguages = (settings.language.options && settings.language.options.length > 1);
        var model = {
            user: null,
            name: ko.observable('').extend({
                required: true
            }),
            email: ko.observable(''),
            password: ko.observable(''),
            type: ko.observable(null),
            expiration: ko.observable(null),
            language: ko.observable(null),
            auth: ko.observable(null),

            languageOptions: settings.language.options,
            languageOptionTitle: function(l) {
                return texts.get('language_' + l);
            },
            languageNoneTitle: texts.get('configAdminUsersUserDialogLangDefault', texts.get('language_' + (settings.language["default"] || 'en'))),

            userTypeOptions: ['a'],
            userTypeOptionTitle: function(type) {
                return texts.get('configAdminUsersType_' + type);
            },
            userTypeNoneTitle: texts.get('configAdminUsersTypeNormal'),

            authOptions: [],
            authOptionTitle: function(ao) {
                return ao;
            },
            authNoneTitle: ""
        };
        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });

        return {
            activate: function(o) {
                model.authOptions = o.authenticationOptions;
                model.authNoneTitle = texts.get('configAdminUsersUserDialogAuthDefault', o.authenticationOptions[0]);
                if (o.user) {
                    model.user = o.user;
                    model.name(o.user.name);
                    model.email(o.user.email);
                    model.type(o.user.user_type);
                    model.expiration(o.user.expiration);
                    model.language(o.user.language);
                    model.auth(o.user.auth);
                }
            },
            attached: function() {
            },
            generatePassword: function() {
                model.password(utils.generatePassword());
            },
            onDialogButton: function(id) {
                if (id == 'no') {
                    this.close();
                    return;
                }
                var user = {
                    name: model.name(),
                    email: model.email(),
                    user_type: model.type(),
                    expiration: model.expiration(),
                    language: model.language(),
                    auth: model.auth()
                }
                if (model.errors().length > 0) {
                    console.log("invalid");
                    console.log(model.errors());
                }
                console.log(user);
            },
            showLanguages: showLanguages,

            model: model
        };
    }
});
