import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import {
    PermissionService
}
from 'kloudspeaker/service/permission-service';

import {
    Session
}
from 'kloudspeaker/session';

import _ from 'underscore';

let logger = LogManager.getLogger('permissions');

//define(['kloudspeaker/utils', 'kloudspeaker/events', 'kloudspeaker/service'], function(utils, events, service) {
@
inject(PermissionService, Session, EventAggregator)
export class Permissions {
    _types = null;
    _filesystemPermissions = {};
    _permissions = {};

    constructor(service, session, events) {
        this.service = service;
        this.session = session;

        var that = this;
        this.subscription = events.subscribe('kloudspeaker/session/start', function(s) {
            if (!s.user) {
                that._types = null;
                that._filesystemPermissions = {};
                that._permissions = {};
                return;
            }
            that._types = s.data.permission_types;
            /*var genericKeys = utils.getKeys(_types.keys.generic);
            var filesystemKeys = utils.getKeys(_types.keys.filesystem);
            _types.keys = {
                generic: genericKeys,
                filesystem: filesystemKeys,
                all: genericKeys.concat(filesystemKeys)
            }*/
            that._updatePermissions(that._permissions, s.data.permissions);
        });
    }

    _updatePermissions(list, permissions) {
        _.each(_.keys(permissions), function(p) {
            list[p] = permissions[p];
        });
    };

    _hasPermission(list, name, required) {
        if (!list || list[name] === undefined) return false;
        var v = list[name];

        var options = _types.values[name];
        if (!required || !options) return v == "1";

        var ui = options.indexOf(v);
        var ri = options.indexOf(required);
        return (ui >= ri);
    }

    getTypes() {
        return _types;
    }

    putFilesystemPermissions(id, permissions) {
        if (!_filesystemPermissions[id]) _filesystemPermissions[id] = {};
        this._updatePermissions(_filesystemPermissions[id], permissions);
    }

    hasFilesystemPermission(item, name, required, dontFetch) {
        if (item.type) {
            // custom folder types need own permission handling
            if (dontFetch) return false;
            return df.resolve(false);
        }
        var df = $.Deferred();
        if (this._types.keys.all.indexOf(name) < 0) {
            if (dontFetch) return false;
            return df.resolve(false);
        }

        var user = session.get().user;
        if (!user) {
            if (dontFetch) return false;
            return df.resolve(false);
        }

        var itemId = ((typeof(item) === "string") ? item : item.id);
        var list = this._filesystemPermissions[itemId];
        var that = this;
        if (!list) {
            if (dontFetch) throw "Cannot resolve permission, permissions not fetched";

            service.itemPermissions(itemId).done(function(p) {
                _filesystemPermissions[itemId] = p;
                df.resolve(that._hasPermission(p, name, required));
            });
        } else {
            var p = this._hasPermission(list, name, required);
            if (dontFetch) return p;
            df.resolve(p);
        }
        return df;
    }

    has(name, required) {
        if (this._types.keys.all.indexOf(name) < 0) return false;

        var user = this.session.getUser();
        if (!user) return false;

        if (user.admin) return true;
        return this._hasPermission(_permissions, name, required);
    }
}
