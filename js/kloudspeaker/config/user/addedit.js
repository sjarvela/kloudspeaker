define(['kloudspeaker/settings', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'knockout'], function(settings, utils, texts, ko) {
    var showLanguages = (settings.language.options && settings.language.options.length > 1);
    var model = {
        user: null,
        name: ko.observable(''),
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
            return "TODO "+type;
        },
        userTypeNoneTitle: 'todo none',

        authOptions: [],
        authOptionTitle: function(ao) {
            return ao;
        },
        authNoneTitle: 'todo none',
    };
    return {
        activate: function(o) {
            console.log("activate");
            console.log(o);
            model.authOptions = o.authenticationOptions;

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
        generatePassword: function() {
            model.password(utils.generatePassword());
        },
        onButton: function(btn, d) {
            if (btn.id == 'no') {
                d.close();
                return;
            }
        },
        showLanguages: showLanguages,

        model: model
    };
});
