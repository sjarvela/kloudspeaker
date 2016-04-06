import {
    bindable,
    inject,
    LogManager
}
from 'aurelia-framework';

import {
    Router
}
from 'aurelia-router';

import _ from 'underscore';

import {
    Session
}
from 'kloudspeaker/session';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

let logger = LogManager.getLogger('views');

@inject(Session, EventAggregator, Router)
export class Views {
    activeViews = [];
    routeConfig = {};
    views = {};

    constructor(session, events, router) {
        this.session = session;
        this.events = events;
        this.router = router;

        this.subscription = this.events.subscribe(
            'router:navigation:success',
            this.navigationSuccess.bind(this));
    }

    navigationSuccess(event) {
        logger.debug(event);

        this.activeView = null;
        this.activeSubView = null;

        var current = this.router.currentInstruction;
        var top = this.findTopInstruction(current);
        var parts = top.fragment.split('/').slice(1);

        var that = this;

        this.activeViews = [];
        logger.debug(parts);
        logger.debug(current);

        var ci = current;
        var cm = null;
        //var cr = null;

        _.each(parts, function(vp) {
            //logger.debug(vp);

            cm = ci ? ci.viewPortInstructions.default.component.viewModel : null;

            that.activeViews.push({
                path: vp,
                view: that.get(vp),
                model: cm
            });
            ci = (ci && ci.viewPortInstructions.default.childRouter) ? ci.viewPortInstructions.default.childRouter.currentInstruction : null;
        });

        //if (parts[0] != 'main' || parts.length < 2) return;

        /*this.activeView = this.get(parts[1]);
        this.activeViewModel = current.viewPortInstructions.default.component.viewModel;

        var that = this;
        if (this.activeViewModel && this.activeViewModel.getSubViews) {
            var asv = parts[2];
            if (this.activeViewModel.getActiveSubView) asv = this.activeViewModel.getActiveSubView();

            if (asv)
                this.activeViewModel.getSubViews().then(sv => {
                    that.subViews = sv;
                    if (parts.length > 2)
                        that.activeSubView = _.find(sv, function(v) {
                            return (v.path == asv);
                        });
                });
        } else this.subViews = this.getSubViews(parts[1]);

        if (parts.length > 2) this.activeSubView = this.get(parts[2]);
        else this.activeSubView = null;*/

        logger.debug(this.activeViews);
        //logger.debug(this.activeSubView);

        this.events.publish('kloudspeaker/view/activate', this.activeViews);
    }

    getActiveViews() {
        return this.activeViews;
    }

    getActiveView(level) {
        if (typeof level === 'number') return this.activeViews[level];
        return this.activeViews ? this.activeViews[this.activeViews.length - 1] : null;
    }

    findTopInstruction(i) {
        var c = i;
        while (c.parentInstruction != null) c = c.parentInstruction;
        return c;
    }

    register(v) {
        var parent = v.parent || '';
        if (!v.route && v.name) v.route = v.name;
        if (!v.path && v.name) v.path = v.name;
        if (typeof this.routeConfig[parent] === 'undefined') this.routeConfig[parent] = [];
        if (v.viewType == 'custom') v.moduleId += '!custom';

        if (v.name)
            this.views[v.name] = v;
        var pv = (parent != '') ? this.get(parent) : null;
        if (!pv || !pv.noChildRoute)
            this.routeConfig[parent].push(v);
    }

    get(id) {
        return this.views[id];
    }

    getSubViews(p) {
        var that = this;
        return new Promise(function(resolve) {
            var found = false;
            _.each(that.activeViews, function(av) {
                if (av.path == p && av.model && av.model.getSubViews) {
                    found = true;

                    av.model.getSubViews().then(sv => {
                        resolve(sv);
                    });
                }
            });

            if (!found)
                resolve(_.filter(that.getRouterConfig(p), function(v) {
                    return !v.redirect;
                }));
        });
    }

    getRouterConfig(p) {
        //var user = this.session.getUser();
        return this.routeConfig[p || ''];
        /*return _.filter(this.routeConfig[p || ''], function(rc) {
            if (rc.requiresAdmin && !user.admin) return false;
            return true;
        });*/
    }
}
