import {
    bindable, inject, LogManager
}
from 'aurelia-framework';
import {
    Views
}
from 'kloudspeaker/views';
let logger = LogManager.getLogger('config');

@
inject(Views)
export class ConfigView {
	constructor(views) {
		this.views = views;
	}

    configureRouter(config, router) {
        config.map(this.views.getRouterConfig('config'));
        this.router = router;
    }
}