define(['kloudspeaker/share', 'kloudspeaker/ui', 'kloudspeaker/ui/texts', 'knockout'], function(share, ui, texts, ko) {
    return function() {
        var that = this;
        var model = {
            id: null,
            title: "",
        };

        return {
            activate: function(params) {
                model.id = params.id;
                model.title = texts.get("shareViewDownloadTitle", params.name);
            },
            attached: function() {
                setTimeout(function() {
                    ui.download(share.getShareUrl(model.id));
                }, 1000);
            },
            model: model
        };
    }
});
