import {
    bindable, inject, LogManager
}
from 'aurelia-framework';

import _ from 'underscore';

import {
    Session
}
from 'kloudspeaker/session';

@inject(Session)
export class Views {
    routeConfig = {};
    views = {};

    constructor(session) {
    	this.session = session;
    }

    register(v) {
        var parent = v.parent || '';
        if (!v.route && v.name) v.route = v.name;
        if (!v.path && v.name) v.path = v.name;
        if (typeof this.routeConfig[parent] === 'undefined') this.routeConfig[parent] = [];
        if (v.viewType == 'custom') v.moduleId += '!custom';

        if (v.name)
            this.views[v.name] = v;
        this.routeConfig[parent].push(v);
    }

    get(id) {
        return this.views[id];
    }

    getSubViews(p) {
        return _.filter(this.getRouterConfig(p), function(v) {
            return !v.redirect;
        });
    }

    getRouterConfig(p) {
    	var user = this.session.getUser();
        return _.filter(this.routeConfig[p || ''], function(rc) {
        	if (rc.requiresAdmin && !user.admin) return false;
            return true;
        });
    }
}
