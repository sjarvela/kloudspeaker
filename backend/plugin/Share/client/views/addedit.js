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
            accessPw: ko.observable(''),
            passwordMissing: ko.observable(false)
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
                model.passwordMissing(false);
                var pwRestriction = (model.accessRestriction() == 'pw');

                if (!model.share && pwRestriction && (!model.accessPw() || model.accessPw().length === 0)) {
                    model.passwordMissing(true);    //TODO dynamic validation
                }
                if (model.errors().length > 0 || model.passwordMissing()) {
                    return;
                }
                var share = {
                    name: model.name(),
                    active: model.active(),
                    restriction: {
                        type: model.accessRestriction()
                    }
                };
                if (pwRestriction) {
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