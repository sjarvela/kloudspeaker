define(['kloudspeaker/app', 'kloudspeaker/service', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/texts', 'knockout'], function(app, service, dialogs, texts, ko) {
    return function() {
        var that = this;
        var model = {
            loading: ko.observable(false),

            success: ko.observable(false),
            failed: ko.observable(false)
        };

        var doApprove = function(id) {
            model.loading(true);
            service.post("registration/approve/" + id, {}).done(function(r) {
                model.loading(false);
                model.success(texts.get('registrationApprovalSuccessMessage', [r.name, r.email]));
            }).fail(function(error) {
                this.handled = true;
                model.loading(false);
                model.failed(texts.get('registrationApprovalFailed'));
            });
        };

        return {
            activate: function(data) {
                var urlParams = data.urlParams;

                if (!urlParams || !urlParams.id || urlParams.id.length === 0) {
                    model.failed(texts.get('registrationInvalidApproval'));
                    return;
                }
                doApprove(urlParams.id);
            },
            model: model
        };
    }
});
