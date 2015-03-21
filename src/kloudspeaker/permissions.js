define('kloudspeaker/permissions', ['kloudspeaker/session', 'durandal/app'], function(session, da) {
    var _types = null;
    var _filesystemPermissions = {};
    var _permissions = {};

    var updatePermissions = function(list, permissions) {
        $.each(kloudspeaker.utils.getKeys(permissions), function(i, p) {
            list[p] = permissions[p];
        });
    };
    da.on('session:start').then(function(s) {
        if (!s.user) return;

        _types = s.permissions.types;
        var genericKeys = kloudspeaker.utils.getKeys(_types.generic);
        var filesystemKeys = kloudspeaker.utils.getKeys(_types.filesystem);
        _types.keys = {
            generic: genericKeys,
            filesystem: filesystemKeys,
            all: genericKeys.concat(filesystemKeys)
        }
        updatePermissions(_permissions, s.permissions.user);
    });

    var hasPermission = function(list, name, required) {
        if (!list || list[name] === undefined) return false;
        var v = list[name];

        var options = _types.values[name];
        if (!required || !options) return v == "1";

        var ui = options.indexOf(v);
        var ri = options.indexOf(required);
        return (ui >= ri);
    };
    
    return {
        getTypes: function() {
            return _types;
        },
        putFilesystemPermissions: function(id, permissions) {
            if (!_filesystemPermissions[id]) _filesystemPermissions[id] = {};
            updatePermissions(_filesystemPermissions[id], permissions);
        },
        hasFilesystemPermission: function(item, name, required) {
            var user = session.get().user;
            if (!user) return false;
            if (user.admin) return true;
            return hasPermission(_filesystemPermissions[((typeof(item) === "string") ? item : item.id)], name, required);
        },
        hasPermission: function(name, required) {
            var user = session.get().user;
            if (!user) return false;
            if (user.admin) return true;
            return hasPermission(_permissions, name, required);
        }
    }
});
