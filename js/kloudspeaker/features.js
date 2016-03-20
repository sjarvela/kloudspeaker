define(['kloudspeaker/session'], function(session) {
    var ft = {};
    ft.hasFeature = function(id) {
        var s = session.get();
        return s.features && s.features[id];
    };

    return ft;
});
