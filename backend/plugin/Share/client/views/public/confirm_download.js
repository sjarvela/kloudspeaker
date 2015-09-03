define(['kloudspeaker/share', 'kloudspeaker/localization', 'kloudspeaker/request', 'kloudspeaker/utils', 'knockout'], function(share, loc, rq, utils, ko) {
    return function() {
        var that = this;
        var model = {
            title: ko.observable("")
        };

        return {
            activate: function(params) {
                that.shareId = params.id;
                that.shareName = params.name;
                model.title(loc.get('shareViewConfirmDownloadTitle', [params.name]));
            },

            model: model,

            onConfirm: function() {
                window.location = utils.urlWithParam(rq.getUrl(), "c", "1");
            }
        };
    }
});
