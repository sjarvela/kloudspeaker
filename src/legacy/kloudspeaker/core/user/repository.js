define(['kloudspeaker/service', 'kloudspeaker/utils'], function(service, utils) {
    var processUser = function(u) {
        u.expiration = u.expiration ? utils.parseInternalTime(u.expiration) : null;
        return u;
    };
    return {
        getAllUsers: function() {
            return service.get('configuration/users').pipe(function(r) {
                _.each(r, processUser);
                return r;
            });
        },
        getUser: function(id) {
            return service.get('configuration/users/'+id).pipe(processUser);
        },
        addUser: function(user) {
            var u = user;
            u.password = u.password ? utils.Base64.encode(u.password) : '';
            u.expiration = u.expiration ? utils.formatInternalTime(u.expiration) : null;
            return service.post("configuration/users/", u);
        },
        updateUser: function(id, user) {
            var u = user;
            u.expiration = u.expiration ? utils.formatInternalTime(u.expiration) : null;
            return service.put("configuration/users/" + id, u);
        }
    };
});
