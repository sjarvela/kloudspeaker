define(['kloudspeaker/share', 'kloudspeaker/service', 'kloudspeaker/ui', 'kloudspeaker/ui/texts', 'knockout'], function(share, service, ui, texts, ko) {
    return function() {
        var that = this;
        var model = {
            title: ko.observable("")
        };

        return {
            activate: function(params) {
                that.shareId = params.id;
                that.shareName = params.name;
                model.title(texts.get('shareViewPreparedDownloadPreparingTitle', [params.name]));
            },
            attached: function() {
                service.get(share.getShareUrl(that.shareId, '/prepare')).done(function(r) {
                    model.title(texts.get('shareViewPreparedDownloadDownloadingTitle', [that.shareName]));
                    ui.download(share.getShareUrl(that.shareId, false, "key=" + r.key));
                }).fail(function() {
                    this.handled = true;
                    model.title(texts.get('shareViewPreparedDownloadErrorTitle', [that.shareName]));
                });
            },
            model: model
        };
    }
});
