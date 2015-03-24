define(['kloudspeaker/resources', 'knockout'], function(res, ko) {
    var model = {
        item: null,
        list: null
    };

    return {
        activate: function(p) {
            console.log("comments/iteminfo");
            var data = p.data();
            console.log(data);

            //var list = data.details && data.details["cloudberry/comments"] ? data.details["cloudberry/comments"] : null;
            model.item = p.item();
            model.list = data;
        },
        getView: function() {
            return res.getPluginUrl('Comment', 'client/views/iteminfo');
        },
        model: model
    };
});
