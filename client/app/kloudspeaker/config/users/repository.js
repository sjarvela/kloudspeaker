define(['jquery', 'kloudspeaker/core_service', 'kloudspeaker/utils'], function($, service, utils) {
    var _cache = {
        all: false,
        byId: {}
    };
    return {
        getAllUsers: function(force) {
            if (!force && _cache.all) return $.Deferred().resolve(_cache.all);

            return service.get('configuration/users/').done(function(u) {
                _cache.all = u;
                _cache.byId = utils.mapByKey(u, 'id');
            });
        },
        getUser: function(id, force) {
            if (!force && _cache.byId[id]) return $.Deferred().resolve(_cache.byId[id]);

            return service.get('configuration/users/'+id).done(function(u) {
                //TODO update to "all"?
                _cache.byId.id = u;
            });
        }
    };
});
