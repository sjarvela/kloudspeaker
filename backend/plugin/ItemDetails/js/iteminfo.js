define(['kloudspeaker/resources', 'knockout'], function(res, ko) {
    var model = {
        item: null,
        data: null
    };

    return {
        activate: function(p) {
            console.log("files/iteminfo");
            var data = p.data();
            console.log(data);

            //var list = data.details && data.details["cloudberry/comments"] ? data.details["cloudberry/comments"] : null;
            model.item = p.item();
            model.data = data;
        },
        getView: function() {
            return res.getPluginUrl('ItemDetails', 'client/iteminfo');
        },
        model: model
    };
});
