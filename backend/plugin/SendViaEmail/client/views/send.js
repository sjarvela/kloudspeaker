define(['kloudspeaker/service', 'kloudspeaker/localization', 'kloudspeaker/utils', 'knockout'], function(service, loc, utils, ko) {
    return function() {
        var that = this;
        var model = {
            title: ko.observable(''),
            msg: ko.observable(''),
            recipient: ko.observable('')
        };

        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });

        return {
            model: model,
            onShow: function(d) {
                if (model.single)
                    d.setTitle(loc.get('sendViaEmailSendSingleTitle'))
                else
                    d.setTitle(loc.get('sendViaEmailSendMultiTitle'))
            },
            getDialogButtons: function() {
                return [{
                    id: "yes",
                    "title": loc.get('sendViaEmailSendAction')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }];
            },
            onDialogButton: function(id) {
                if (id == 'no') {
                    this.close();
                    return;
                }
                var that = this;
                //TODO validate

                service.post('sendviaemail', {
                    items: model.items,
                    title: model.title(),
                    msg: model.msg(),
                    to: model.recipient()
                }).done(function() {
                    that.close();
                });
            },
            activate: function(params) {
                if (params.item) {
                    model.single = true;
                    model.items = [params.item];
                } else {
                    model.single = false;
                    model.items = params.items;
                }
            }
        };
    };
});
