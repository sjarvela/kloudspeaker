define(['kloudspeaker/share', 'kloudspeaker/service', 'kloudspeaker/ui', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/formatters', 'knockout'], function(share, service, ui, texts, formatters, ko) {
    return function() {
        var that = this;
        var uploadSpeedFormatter = new formatters.Number(1, texts.get('dataRateKbps'), texts.get('decimalSeparator'));

        var model = {
            uploadUrl: "",
            title: "",

            uploadState: ko.observable(''),
            uploadTitle: ko.observable(''),
            uploadSpeed: ko.observable(''),
            uploadProgress: ko.observable(0)
        };

        return {
            activate: function(params) {
                that.shareId = params.id;
                that.shareName = params.name;

                model.uploadUrl = share.getShareUrl(that.shareId, false, "format=binary");
                model.title = texts.get('shareViewUploadTitle', [params.name]);
            },
            uploadHandler: {
                start: function(files, ready) {
                    model.uploadState("");
                    model.uploadSpeed("");
                    model.uploadProgress(0);
                    model.uploadTitle(texts.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length));
                    ready();
                },
                progress: function(pr, br) {
                    if (br) model.uploadSpeed(uploadSpeedFormatter.format(br / 1024));
                    model.uploadProgress(pr);
                },
                finished: function() {
                    setTimeout(function() {
                        model.uploadSpeed("");
                        model.uploadProgress(0);
                        model.uploadState("success");
                        model.uploadTitle(texts.get('mainviewFileUploadComplete'));
                    }, 1000);
                },
                failed: function(e) {
                    model.uploadSpeed("");
                    model.uploadProgress(0);
                    model.uploadState("failure");
                    if (e && e.code == 216) {
                        model.uploadTitle(texts.get('mainviewFileUploadNotAllowed'));
                    } else {
                        model.uploadTitle(texts.get('mainviewFileUploadFailed'));
                    }
                }
            },
            model: model
        };
    }
});
