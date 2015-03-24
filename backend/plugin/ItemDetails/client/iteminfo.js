define(['kloudspeaker/resources', 'knockout'], function(res, ko) {
    var model = {
        item: null,
        data: null
    };

    return {
        activate: function(p) {
            console.log("itemdetails/iteminfo");
            var data = p.data();

            model.item = p.item();
            model.data = data;
        },
        getView: function() {
            return res.getPluginUrl('ItemDetails', 'client/views/iteminfo');
        },
        model: model
    };
});
