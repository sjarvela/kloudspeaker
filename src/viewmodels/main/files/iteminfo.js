define(['knockout'], function(ko) {
    var model = {
        item: null,
        data: null
    };

    return {
        formatters: {
            timestamp: {
                format: function(f) {
                    return "foo " + f;
                }
            }
        },
        activate: function(p) {
            console.log("files/iteminfo");
            var data = p.data();
            console.log(data);

            //var list = data.details && data.details["cloudberry/comments"] ? data.details["cloudberry/comments"] : null;
            model.item = p.item();
            model.data = data;
        },
        getView: function() {
            //TODO util that resolves plugin url from "comments/public/templates/itemdetails"
            return 'views/main/files/iteminfo';
        },
        model: model
    };
});
