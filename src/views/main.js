import {
    bindable, inject, LogManager
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
    activeSubView = null;

    constructor(views, events) {
        this.views = views;
        this.events = events;
    }

    attached() {
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
        console.log(parts);
        if (parts[0] != 'main' || parts.length < 2) return;

        this.activeView = this.views.get(parts[1]);
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
        } else this.subViews = this.views.getSubViews(parts[1]);

        if (parts.length > 2) this.activeSubView = this.views.get(parts[2]);
        else this.activeSubView = null;

        console.log(this.activeView);
        console.log(this.activeSubView);
    }

    findTopInstruction(i) {
        var c = i;
        while (c.parentInstruction != null) c = c.parentInstruction;
        return c;
    }

    configureRouter(config, router) {
        config.map(this.views.getRouterConfig('main'));
        this.router = router;
    }

    activate() {
        this.mainViews = this.views.getSubViews('main');
    }
}
