define(['kloudspeaker/instance', 'kloudspeaker/localization'], function(app, loc) {
    return function() {
        var that = this;
        var model = {
            share: null,
            item: null
        };

        return {
            model: model,
            onShow: function(container) {
                container.setTitle(loc.get('shareDialogQuickShareTitle'));
            },
            getDialogButtons: function() {
                return [{
                    id: "no",
                    "title": loc.get('dialogClose')
                }];
            },
            onDialogButton: function(id) {
                this.close();
            },
            activate: function(params) {
                model.share = params.share;
                model.item = params.item;
                model.shareLink = app.getPageUrl("share/" + params.share.id);
            }
        };
    };
});
