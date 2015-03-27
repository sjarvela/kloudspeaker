define(['jquery', 'kloudspeaker/service', 'kloudspeaker/utils'], function($, service, utils) {
    var user_service = service.get('configuration/users/');
    var _cache = {
        all: false,
        byId: {}
    };
    return {
        getAllUsers: function(force) {
            if (!force && _cache.all) return $.Deferred().resolve(_cache.all);

            return user_service.get('').done(function(u) {
                _cache.all = u;
                _cache.byId = utils.mapByKey(u, 'id');
            });
        },
        getUser: function(id, force) {
            if (!force && _cache.byId[id]) return $.Deferred().resolve(_cache.byId[id]);

            return user_service.get(id).done(function(u) {
                //TODO update to "all"?
                _cache.byId.id = u;
            });
        },
        addUser: function(u) {
            return user_service.post("", u);
        },
        editUser: function(u) {
            return user_service.put(u.id, u);
        },
        query: function(p) {
            return user_service.post('query', p);
        }
    };
});
