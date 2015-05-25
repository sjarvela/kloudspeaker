define(['kloudspeaker/share', 'kloudspeaker/app', 'kloudspeaker/service', 'kloudspeaker/ui', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/dialogs', 'knockout'], function(share, app, service, ui, texts, dialogs, ko) {
    return function() {
        var that = this;
        var model = {
            password: ko.observable('').extend({
                required: true
            }),
            editing: ko.observable(false)
        };
        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });

        return {
            activate: function(params) {
                that.shareId = params.id;
                that.shareInfo = params.info;
            },
            model: model,
            onAccess: function() {
                if (model.errors().length > 0) {
                    model.password.valueHasMutated();
                    return;
                }
                var key = window.Base64.encode(model.password());

                service.post("public/" + that.shareId + "/key/", {
                    key: key
                }).done(function(r) {
                    if (!r.result) {
                        dialogs.notification({
                            message: texts.get('shareAccessPasswordFailed')
                        });
                        model.editing(true);
                        return;
                    }
                    //proceed to original view
                    app.showFullView(share.getShareView(that.shareId, that.shareInfo, key));
                });
            }
        };
    }
});
