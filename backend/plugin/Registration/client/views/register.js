define(['kloudspeaker/app', 'kloudspeaker/service', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'kloudspeaker/utils'], function(app, service, dialogs, texts, utils) {
    return function() {
        var that = this;
        var model = {
            name: ko.observable('').extend({
                required: true
            }),
            email: ko.observable('').extend({
                required: true
            }),
            password: ko.observable('').extend({
                required: true
            }),
            hint: ko.observable(''),

            success: ko.observable(false)
        };
        model.passwordConfirm = ko.observable('').extend({
            required: true,
            areSame: model.password
        });
        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });

        return {
            model: model,
            onRegister: function() {
                if (model.errors().length > 0) {
                    //TODO trigger forced validation
                    model.name.valueHasMutated();
                    model.email.valueHasMutated();
                    model.password.valueHasMutated();
                    model.passwordConfirm.valueHasMutated();
                    return;
                }

                service.post("registration/create", {
                    name: model.name(),
                    password: utils.Base64.encode(model.password()),
                    email: model.email(),
                    hint: model.hint(),
                    data: null
                }).done(function() {
                    model.success(true);
                }).fail(function(er) {
                    this.handled = true;
                    if (er.code == 301)
                        dialogs.error({
                            message: texts.get('registrationFailedDuplicateNameOrEmail')
                        });
                    else
                        dialogs.error({
                            message: texts.get('registrationFailed')
                        });
                });
            }
        };
    }
});
