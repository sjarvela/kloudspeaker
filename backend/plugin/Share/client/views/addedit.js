define(['kloudspeaker/share', 'kloudspeaker/share/repository', 'kloudspeaker/ui/texts', 'kloudspeaker/utils', 'knockout'], function(share, repository, texts, utils, ko) {
    return function() {
        var that = this;
        var model = {
            share: null,
            item: null,
            itemName: ko.observable(''),

            name: ko.observable(''),
            type: ko.observable(''),
            typeOptions: ko.observableArray([]),
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

        model.typeOptionTitle = function(type) {
            var t = type;
            if (t == 'prepared_download') t = 'download';

            if (model.item.custom)
                return texts.get('shareDialogShareType_' + t);
            else
                return texts.get('shareDialogShareType_' + (model.item.is_file ? 'file' : 'folder') + '_' + t);
        };

        return {
            model: model,
            onShow: function(container) {
                that._container = container;

                if (model.edit) {
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

                if (pwRestriction && (!model.edit || model.originalAccessRestriction != 'pw')) {
                    if (!model.accessPw() || model.accessPw().length === 0) {
                        model.passwordMissing(true); //TODO dynamic validation
                    }
                }
                if (model.errors().length > 0 || model.passwordMissing()) {
                    return;
                }
                var share = {
                    name: model.name(),
                    type: model.type(),
                    active: model.active(),
                    expiration: model.expiration(),
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
                    repository.getShare(params.share.id, true).done(function(r) {
                        model.share = r.share;
                        model.item = r.item;

                        model.itemName(r.item.name);

                        model.name(model.share.name);
                        model.type(r.share.type);
                        model.typeOptions(r.share_types);
                        model.active(model.share.active);
                        model.expiration(model.share.expiration);
                        model.accessRestriction(model.share.restriction || 'no');
                        model.originalAccessRestriction = model.accessRestriction();
                    });
                } else {
                    model.item = params.item;

                    model.itemName(params.item.name);
                    repository.getShareOptions(params.item.id).done(function(r) {
                        model.type(r.share_types[0]);
                        model.typeOptions(r.share_types);
                    });
                }
            }
        };
    };
});
