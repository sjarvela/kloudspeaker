define(['kloudspeaker/app', 'kloudspeaker/service', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'knockout'], function(app, service, dialogs, texts, ko) {
    return function() {
        var that = this;
        var model = {
            loading: ko.observable(false),

            // scenario: failed
            failed: ko.observable(false),
            
            // scenario: confirmed
            confirmed: ko.observable(false),
            confirmedRequireApproval: ko.observable(false),

            // scenario: form
            showForm: ko.observable(false),

            email: '',
            key: ko.observable('').extend({
                required: true
            })
        };
        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });
        var doConfirm = function(email, key) {
            model.loading(true);
            return service.post("registration/confirm", {
                email: email,
                key: key
            }).done(function(r) {
                model.loading(false);
                model.confirmedRequireApproval(!!r.require_approval);
                model.confirmed(true);
            }).fail(function(error) {
                this.handled = true;
                model.loading(false);
                model.failed(texts.get('registrationConfirmFailed'));
            });
        };

        return {
            activate: function(data) {
                var urlParams = data.urlParams;

                if (!urlParams || !urlParams.email || urlParams.email.length === 0) {
                    model.failed(texts.get('registrationInvalidConfirm'));
                    return;
                }
                model.email = urlParams.email;

                if (urlParams.key && urlParams.key.length > 0) {
                    doConfirm(urlParams.email, urlParams.key);
                } else {
                    model.showForm(true);
                }
            },
            model: model,
            onConfirm: function() {
                if (model.errors().length > 0) {
                    //TODO trigger forced validation
                    model.key.valueHasMutated();
                    return;
                }
                model.showForm(false);
                doConfirm(model.email, model.key());
            }
        };
    }
});
