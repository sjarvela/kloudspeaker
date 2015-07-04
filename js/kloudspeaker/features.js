define([], function() {
    //TODO remove global references

    var ft = {};
    ft.hasFeature = function(id) {
        return kloudspeaker.session.features && kloudspeaker.session.features[id];
    };

    return ft;
});
