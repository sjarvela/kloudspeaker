define(['kloudspeaker/share', 'kloudspeaker/share/repository', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'knockout'], function(share, repository, texts, utils, ko) {
    return function() {
        var that = this;
        var model = {
            share: null,
            item: null,

            name: ko.observable(''),
            active: ko.observable(true),
            expiration: ko.observable(null),
            accessRestriction: ko.observable('no'),
            accessPw: ko.observable('')
        };

        model.errors = ko.validation.group(model, {
            observable: true,
            deep: false
        });

        return {
            model: model,
            onShow: function(container) {
                that._container = container;

                //TODO title (share file download etc)
                if (model.share) {
                    container.setTitle(texts.get('shareDialogShareEditTitle'));
                } else {
                    container.setTitle(texts.get('shareDialogShareCreateNewTitle'));
                }
            },
            getDialogButtons: function() {
                return [{
                    id: "yes",
                    "title": texts.get('dialogSave')
                }, {
                    id: "no",
                    "title": texts.get('dialogCancel')
                }];
            },
            onDialogButton: function(id) {
                if (id == 'no') {
                    this.close();
                    return;
                }
                if (model.errors().length > 0) {
                    return;
                }
                var share = {
                    name: model.name(),
                    active: model.active(),
                    restriction: {
                        type: model.accessRestriction()
                    }
                };
                if (model.accessRestriction() == 'pw') {
                    share.restriction.value = model.accessPw();
                }

                if (model.share) {
                    repository.editShare(model.share.id, share).done(function() {
                        that._container.complete(share);
                    });
                } else {
                    repository.addItemShare(model.item, share).done(function() {
                        that._container.complete(share);
                    })
                }
            },
            activate: function(params) {
                if (params.share) {
                    model.edit = true;
                    model.share = params.share;

                    model.name(model.share.name);
                    model.active(model.share.active);
                    model.accessRestriction(model.share.restriction);
                } else
                    model.item = params.item;
            }
        };
    };
});

/*
this._initShareEditor = function(share, $c, o) {
        ui.process($c, ["localize"]);
        controls.datepicker("share-validity-expirationdate-value", {
            format: texts.get('shortDateTimeFormat'),
            time: true
        });

        $("#share-general-name").val(share ? share.name : '');
        $("#share-general-active").attr("checked", share ? share.active : true);

        var oldRestrictionPw = (share ? share.restriction == 'pw' : false);
        if (share) {
            if (share.restriction == 'pw')
                $("#share-access-public-password").attr('checked', true);
            else if (share.restriction == 'private')
                $("#share-access-private-loggedin").attr('checked', true);
            else
                $("#share-access-norestriction").attr('checked', true);
        } else
            $("#share-access-norestriction").attr('checked', true);

        if (share && share.expiration)
            $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").set((typeof(share.expiration) === 'string') ? utils.parseInternalTime(share.expiration) : share.expiration);

        if (oldRestrictionPw) $("#share-access-public-password-value").attr("placeholder", texts.get("shareDialogShareAccessChangePwTitle"));
        else $("#share-access-public-password-value").attr("placeholder", texts.get("shareDialogShareAccessEnterPwTitle"));

        var getValues = function() {
            var name = $("#share-general-name").val();
            var active = $("#share-general-active").is(":checked");
            var expiration = $("#share-validity-expirationdate-value").data("kloudspeaker-datepicker").get();

            var restriction = false;
            if ($("#share-access-private-loggedin").is(":checked")) restriction = {
                type: "private"
            };
            else if ($("#share-access-public-password").is(":checked")) {
                var value = $("#share-access-public-password-value").val();
                if (!oldRestrictionPw && (!value || value.length === 0)) {
                    $("#share-access-public-password-value").addClass("error");
                    return false;
                }
                restriction = {
                    type: "pw",
                    value: value
                };
            }

            return {
                name: name,
                expiration: expiration,
                active: active,
                restriction: restriction
            };
        }
        $("#share-addedit-btn-ok").click(function() {
            var v = getValues();
            if (!v) return;
            o.onEdit(v);
        });

        $("#share-addedit-btn-cancel").click(function() {
            o.onCancel();
        });

        return {
            getValues: getValues
        }
    };
*/
