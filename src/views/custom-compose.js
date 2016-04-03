import {
    inject, bindable, LogManager
}
from 'aurelia-framework';

let logger = LogManager.getLogger('custom-compose');
let ccId = 0;

export class CustomCompose {
    constructor() {
        this.id = ccId++;
    }

    bind(bindingContext) {
        logger.debug('bind', bindingContext)
    }

    unbind() {
        logger.debug('unbind');
        if (this.getContentType() == 'viewmodel') {
            var ko = require('knockout');
            ko.utils.domNodeDisposal.removeNode(this.$e[0]);
        }
    }

    activate(ctx) {
    	logger.debug('activate', ctx);
        this.ctx = ctx;
        if (this._attached) this.init();
    }

    deactivate() {
        logger.debug('deactivate');
    }

    attached(e) {
        this._attached = true;
        logger.debug('attached');

        this.$e = $("#kloudspeaker-custom-compose-"+this.id);
        this.init();
    }

    getContentType() {
        return this.ctx.content.viewType || 'custom';
    }

    init() {
        logger.debug('init');
        var type = this.getContentType();

        if (type == 'tmpl') {
            var that = this;
            require(['text!' + this.ctx.content.tmpl + ".html"], function(tmpl) {
                var $c = $('<div class="custom-compose-container">').appendTo(this.$e.empty()).html(tmpl);
                if (this.ctx.content.attached) this.ctx.content.attached($c);
            });
        } else if (type == 'custom') {
            this.$e.empty();
            var $c = $('<div class="custom-compose-container">').appendTo(this.$e);
            if (this.ctx.content.render) this.ctx.content.render($c, this.ctx);
        } else if (type == 'viewmodel') {
            var that = this;
            require(['kloudspeaker/ui', this.ctx.content.module], function(ui, m) {
                var tmpl = 'text!' + this.ctx.content.module + ".html";
                if (typeof(m) == 'function') m = m(this.ctx);
                if (m.view) tmpl = 'text!' + m.view;

                require(tmpl, function(tmpl) {
                    //'text!' + o.content.module + ".html"
                    that.$e.empty().html(tmpl);
                    ui.viewmodel(that.$e, m, this.ctx);
                });
            });
        }
    }
}