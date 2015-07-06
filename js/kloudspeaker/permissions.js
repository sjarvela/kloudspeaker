define(['kloudspeaker/session', 'kloudspeaker/utils', 'kloudspeaker/events'], function(session, utils, events) {
    var _types = null;
    var _filesystemPermissions = {};
    var _permissions = {};

    var updatePermissions = function(list, permissions) {
        $.each(utils.getKeys(permissions), function(i, p) {
            list[p] = permissions[p];
        });
    };
    events.addEventHandler(function(e) {
        var s = e.payload;
        if (!s.user) {
            _types = null;
            _filesystemPermissions = {};
            _permissions = {};
            return;
        }
        _types = s.data.permission_types;
        /*var genericKeys = utils.getKeys(_types.keys.generic);
        var filesystemKeys = utils.getKeys(_types.keys.filesystem);
        _types.keys = {
            generic: genericKeys,
            filesystem: filesystemKeys,
            all: genericKeys.concat(filesystemKeys)
        }*/
        updatePermissions(_permissions, s.data.permissions);
    }, 'session/start');

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
            if (_types.keys.all.indexOf(name) < 0) return false;

            var user = session.get().user;
            if (!user) return false;
            
            if (user.admin) return true;
            return hasPermission(_filesystemPermissions[((typeof(item) === "string") ? item : item.id)], name, required);
        },
        hasPermission: function(name, required) {
            if (_types.keys.all.indexOf(name) < 0) return false;

            var user = session.get().user;
            if (!user) return false;
            
            if (user.admin) return true;
            return hasPermission(_permissions, name, required);
        }
    }
});
