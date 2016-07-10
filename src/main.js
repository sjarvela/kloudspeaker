import 'jquery';
import 'bootstrap';
import 'datepicker/js/bootstrap-datepicker';

import {
    ViewLocator
}
from 'aurelia-framework';

import {
    Origin
}
from 'aurelia-metadata';

import {
    DefaultLoader
}
from 'aurelia-loader-default';

import {
    NoViewStrategy
}
from 'aurelia-templating';

import { I18N } from 'aurelia-i18n';
import Backend from 'i18next-xhr-backend';

String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};

export function configure(aurelia) {
    setup(aurelia);

    aurelia.use
        .standardConfiguration()
        .developmentLogging()
        //.plugin('aurelia-ui-virtualization')
        .plugin('aurelia-dialog')
        .globalResources('kloudspeaker/localizedValueConverter')
        .plugin('aurelia-i18n', (instance) => {
            instance.i18next.use(Backend);

            return instance.setup({
                backend: {
                    loadPath: 'locales/{{lng}}/{{ns}}.json',
                },
                lng: 'en',
                attributes: ['t', 'i18n'],
                fallbackLng: 'en',
                debug: false
            });
        });

    /*ViewLocator.prototype.convertOriginToViewUrl = (origin) => {
        let moduleId = origin.moduleId;
        console.log(origin);
        return "view.html";
    };*/

    aurelia.start().then(() => {
        aurelia.setRoot();
    });
}

function setup(aurelia) {
    require.config({
        baseUrl: 'http://localhost:8888/kloudspeaker-aurelia/src/legacy/',
        paths: {
            'knockout': '../vendor/knockout-3.3.0',
            'durandal': '../vendor/durandal/js/',
            'text': '../vendor/requirejs-text/text'
        },
        /*packages: [{
            name: 'templates',
            location: '../templates'
        }]*/
    });

    define('jquery', [], function() {
        return $;
    });
    define('knockout', [], ko);

    var orlm = aurelia.loader.loadModule;
    aurelia.loader.loadModule = function(id) {
        if (id.endsWith("!custom")) {
            var nid = id.startsWith('http') ? id.substring('http://localhost:8888/kloudspeaker-aurelia/src/'.length, id.length - 7) : id.substring(0, id.length - 7);
            return new Promise(function(resolve) {
                require([nid], function(m) {
                    var moduleName = nid.replaceAll('/', '_');
                    var model = m;

                    if ((typeof m) == 'function') {
                        model = m();
                    } else {
                        if (m.__moduleName) {
                            moduleName = m.__moduleName;
                            if (m[moduleName] && (typeof m[moduleName]) == 'function') model = new m[m.__moduleName]();
                        }
                    }

                    model.getViewStrategy = function() {
                        return new CustomViewStrategy(nid);
                    };

                    var r = function() {
                        return model;
                    };

                    Origin.set(r, new Origin(nid, 'default'));
                    resolve(r);
                });
            });
        }
        return orlm.apply(aurelia.loader, [id]);
    };
}

class CustomViewStrategy {
    constructor(module) {
        this.module = module;
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext) {
        return Promise.resolve(new CustomViewFactory(this.module, viewEngine, compileInstruction, loadContext));
    }

    makeRelativeTo(o) {}
}

class CustomViewFactory {
    constructor(module, viewEngine, compileInstruction, loadContext) {
        this.module = module;
    }

    create(container, createInstruction, element) {
        return new CustomView(this.module, container, createInstruction, element);
    }
}

class CustomView {
    constructor(module, container, createInstruction, element) {
        this.module = module;
        this.instructions = createInstruction;
        console.log('view');
        console.log(container);
        console.log(createInstruction);
        console.log(element);
    }

    bind(bindingContext, overrideContext, _systemUpdate) {
        console.log('bind');
    }

    attached() {
        console.log('bind');
    }

    created() {
        console.log('created');
    }

    detached() {
        console.log('detached');
    }

    insertNodesBefore(n) {
        console.log('insertNodesBefore');
        console.log(n);
    }

    appendNodesTo(n) {
        console.log('appendNodesTo');
        console.log(n);
        var $e = $(n);
        if (this.instructions.viewModel.__viewType == 'custom-tmpl') {
            var that = this;
            require(['text!' + this.module + ".html"], function(tmpl) {
                $e.empty().html(tmpl);
                var $c = $('<div class="klouspeaker-legacy-view"></div>').appendTo($e);
                if (that.instructions.viewModel.attached) that.instructions.viewModel.attached($e, $c);
            });
        } else if (this.instructions.viewModel.__viewType == 'custom') {
            $e.empty();
            var $c = $('<div class="klouspeaker-legacy-view"></div>').appendTo($e);
            if (this.instructions.viewModel.attached) this.instructions.viewModel.attached($e, $c);
        } else {
            var that = this;
            require(['kloudspeaker/ui', 'text!' + this.module + ".html"], function(ui, tmpl) {
                that.$c = $('<div class="klouspeaker-legacy-view"></div>').appendTo($e.empty());
                that.$c.html(tmpl);
                ui.viewmodel(that.$c, that.instructions.viewModel);
            });
        }
    }

    removeNodes() {
        console.log('removeNodes');
    }

    returnToCache() {
        console.log('returnToCache');
    }

    unbind() {
        console.log('unbind');
        if (this.$c) {
            ko.utils.domNodeDisposal.removeNode(this.$c[0]);
            this.$c = false;
        }
    }
}
