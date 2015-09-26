define(['kloudspeaker/utils', 'kloudspeaker/events', 'kloudspeaker/service'], function(utils, events, service) {
    var _types = null;
    var _filesystemPermissions = {};
    var _permissions = {};
    var _customTypes = {};
    var session = null;

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
        setup: function() {
            session = require('kloudspeaker/session');
        },
        registerCustomFolderTypePermissionHandler: function(type, h) {
            _customTypes[type] = h;
        },
        getTypes: function() {
            return _types;
        },
        putFilesystemPermissions: function(id, permissions) {
            if (!_filesystemPermissions[id]) _filesystemPermissions[id] = {};
            updatePermissions(_filesystemPermissions[id], permissions);
        },
        hasFilesystemPermission: function(item, name, required, dontFetch) {
            if (item.type) {
                if (_customTypes[item.type]) {
                    var list = {};
                    list[name] = _customTypes[item.type](item, name);
                    var p = hasPermission(list, name, required);
                    if (dontFetch) return p;
                    return df.resolve(p);
                }

                if (dontFetch) return false;
                return df.resolve(false);
            }
            var df = $.Deferred();
            if (_types.keys.all.indexOf(name) < 0) {
                if (dontFetch) return false;
                return df.resolve(false);
            }
            
            var user = session.get().user;
            if (!user) {
                if (dontFetch) return false;
                return df.resolve(false);
            }

            var itemId = ((typeof(item) === "string") ? item : item.id);
            var list = _filesystemPermissions[itemId];
            if (!list) {
                if (dontFetch) throw "Cannot resolve permission, permissions not fetched";

                service.get('permissions/items/' + itemId).done(function(p) {
                    _filesystemPermissions[itemId] = p;
                    df.resolve(hasPermission(p, name, required));
                });
            } else {
                var p = hasPermission(list, name, required);
                if (dontFetch) return p;
                df.resolve(p);
            }
            return df;
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
