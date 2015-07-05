define(['kloudspeaker/session'], function(session) {
    //TODO remove global references

    var ft = {};
    ft.hasFeature = function(id) {
        var s = session.get();
        return s.features && s.features[id];
    };

    return ft;
});
