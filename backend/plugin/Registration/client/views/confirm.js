define(['kloudspeaker/app', 'kloudspeaker/service', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts'], function(app, service, dialogs, texts) {
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
            passwordConfirm: ko.observable('').extend({
                required: true
            }),
            hint: ko.observable(''),

            success: ko.observable(false)
        };

        return {
            model: model,
            onRegister: function() {
                service.post("registration/create", {
                    name: model.name(),
                    password: window.Base64.encode(model.password()),
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
