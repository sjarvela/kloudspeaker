import {
    bindable,
    inject,
    LogManager
}
from 'aurelia-framework';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import {
    Views
}
from 'kloudspeaker/views';

import _ from 'underscore';

let logger = LogManager.getLogger('main');

@
inject(Views, EventAggregator)
export class MainView {
    mainViews = [];
    subViews = [];

    activeView = null;
    activeViewModel = null;
    activeSubView = null;

    constructor(views, events) {
        this.views = views;
        this.events = events;

        var that = this;
        this.subscription = this.events.subscribe(
            'kloudspeaker/view/activate',
            function(vl) {
                logger.debug("nav");
                that.updateActiveView(vl);
            });
    }

    attached() {
        //_attached = true;
    }

    detached() {
        //_attached = false;
        //this.events.subscribe(this.subscription);
    }

    updateActiveView(vl) {
        var that = this;
        that.activeView = null;
        that.activeViewModel = null;
        that.subViews = null;
        that.activeSubView = null;

        if (!vl || vl.length === 0) return;
        
        that.activeView = vl[1].view;
        that.activeViewModel = vl[1].model;

        if (that.activeView != null)
            that.views.getSubViews(vl[1].path).then(svl => {
                that.subViews = svl;

                //TODO rethink active view resolving
                that.activeSubView = (vl.length > 2) ? vl[2].view : null;
                if (that.activeViewModel && that.activeViewModel.getActiveSubView)
                    that.activeSubView = that.activeViewModel.getActiveSubView();

                if ((!that.activeSubView && vl.length > 2))
                    that.activeSubView = _.find(svl, function(v) {
                        return (v.path == vl[2].path);
                    });
            });
    }

    configureRouter(config, router) {
        config.map(this.views.getRouterConfig('main'));
        this.router = router;
    }

    activate() {
        logger.debug("activate");

        var that = this;
        this.views.getSubViews('main').then(mvl => {
            this.mainViews = mvl;
        });
        //this.updateActiveView(that.views.getActiveViews());
    }
}
