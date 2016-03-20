import {
    bindable, inject, LogManager
}
from 'aurelia-framework';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import {
    Redirect
}
from 'aurelia-router';

import _ from 'underscore';

import moment from 'moment';
import fi from 'moment/locale/fi';

import {
    Session
}
from 'kloudspeaker/session';
import {
    Permissions
}
from 'kloudspeaker/permissions';
import {
    Filesystem
}
from 'kloudspeaker/filesystem';
import {
    ServiceBase
}
from 'kloudspeaker/service/service-base';
import {
    Views
}
from 'kloudspeaker/views';

let logger = LogManager.getLogger('app');

@
inject(Session, Permissions, Filesystem, EventAggregator, ServiceBase, Views)
export class App {
    activeView = null;

    constructor(session, permissions, fs, events, service, views) {
        let that = this;

        this.session = session;
        this.events = events;
        this.views = views;

        moment.locale('fi');

        // root
        views.register({
            //route: 'login',
            name: 'login',
            moduleId: './views/login'
        });
        views.register({
            //route: 'main',
            name: 'main',
            moduleId: './views/main'
        });

        // main
        views.register({
            parent: 'main',
            route: '',
            redirect: '/main/files'
        });
        views.register({
            parent: 'main',
            title: 'Files',
            route: ['files', 'files/:id'],
            name: 'files',
            moduleId: './main/files',
            toolbarView: './main/files/toolbar'
        });
        views.register({
            parent: 'main',
            //route: 'config',
            title: 'Configuration',
            name: 'config',
            moduleId: './main/config'
        });

        // config
        views.register({
            parent: 'config',
            route: '',
            redirect: '/main/config/account'
        });
        views.register({
            parent: 'config',
            //route: 'account',
            name: 'account',
            moduleId: './config/account!custom'
        });
        views.register({
            parent: 'config',
            //route: 'system',
            name: 'system',
            viewType: 'custom',
            moduleId: './config/system',
            requiresAdmin: true
        });
        views.register({
            parent: 'config',
            //route: 'folders',
            name: 'folders',
            viewType: 'custom',
            moduleId: './config/folders',
            requiresAdmin: true
        });
        setupLegacy(session, permissions, fs, service);
    }

    attached() {
        this.subscription = this.events.subscribe(
            'router:navigation:success',
            this.navigationSuccess.bind(this));
    }

    detached() {
        this.subscription.dispose();
    }

    canActivate(params, routeConfig, navigationInstruction) {
        console.log("can activate");
        return true;
    }

    configureRouter(config, router) {
        config.title = 'Kloudspeaker';
        config.map(this.views.getRouterConfig());
        config.addPipelineStep('authorize', RouteWatchStep);
        config.mapUnknownRoutes(instruction => {
            logger.debug("unknown");
            logger.debug(instruction);
            instruction.fragment = '/main/files';
            return {
                redirect: '/main/files'
            };
            //check instruction.fragment
            //return moduleId
        });

        this.router = router;

        var that = this;
        this.subscription = this.events.subscribe('kloudspeaker/session/start', function(e) {
            if (that.session.isLoggedIn())
                that.router.navigate('/main/files');
        });
    }

    navigationSuccess(event) {
        logger.debug(event);
        //this.activeView = event.instruction.config;
        //this.activeViewModel = event.instruction.viewPortInstructions.default.component.viewModel;
    }

    activate() {
        var that = this;
        logger.debug("Activate app");

        return new Promise(function(resolve) {
            setupLegacy().then(() => {
                that.session.initialize().then(() => {
                    resolve();
                })
            });
        });
    }
}

@
inject(Session)
class RouteWatchStep {
    constructor(session) {
        this.session = session;
    }

    run(routingContext, next) {
        logger.debug(routingContext);

        var needsAuth = (routingContext.fragment != '/login'); //TODO
        var loggedIn = this.session.isLoggedIn();
        if (needsAuth && !loggedIn) {
            logger.debug("Forwarding to files");
            return next.cancel(new Redirect('/login')); //TODO
        }

        if (routingContext.fragment == '/' || (loggedIn && routingContext.fragment == '/login')) {
            logger.debug("Forward to default page");
            return next.cancel(new Redirect('/main/files')); //TODO
        }

        /*if (routingContext.fragment == '/' && this.session.isInitialized()) {
            logger.debug("Forwarding to files");
            return next.cancel(new Redirect('/main/files'));    //TODO
        }*/

        //logger.debug(next);
        /*if (routingContext.nextInstructions.some(i => i.config.auth)) {
            this.client.get('auth/login')
                .then(response => {
                    this.user = response.content;
                });
        }*/
        return next();
    }
}

function setupLegacy(session, permissions, fs, service) {
    return new Promise(function(resolve) {
        define('kloudspeaker/session', function() {
            return {
                get: function() {
                    var u = session.getUser();
                    u.hasPermission = permissions.has.bind(permissions);
                    var d = session.getData();

                    return _.extend({
                        user: u
                    }, d);
                }
            };
        });
        var settings = {};
        define('kloudspeaker/settings', [], settings);
        define('kloudspeaker/permissions', function() {
            return {
                hasPermission: permissions.has.bind(permissions)
            };
        });
        define('kloudspeaker/events', function() {
            return {
                addEventHandler: function(cb, t) {
                    that.events.subscribe(t, cb);
                }
            };
        });
        define('kloudspeaker/service', function() {
            return {
                get: function(p) {
                    var df = $.Deferred();
                    service.get(p).then(r => {
                        df.resolve(r);
                    });
                    return df;
                }
            };
        });
        var loc = {
            get: function(key) {
                return 'text-' + key; //TODO
            }
        };
        define('kloudspeaker/localization', function() {
            return loc;
        });
        define('kloudspeaker/ui/texts', function() {
            return loc;
        });
        define('kloudspeaker/ui/views', function() {
            return {
                getActiveConfigView: function() {
                    return {
                        showLoading: function() {}
                    };
                }
            };
        });
        define('kloudspeaker/filesystem', function() {
            return {};
        });
        define('kloudspeaker/instance', [], {
            mobile: false,
            __initialized: true,
            getElement: function() {
                return $("#kloudspeaker");
            }
        });
        require(['kloudspeaker/instance', 'kloudspeaker/ui', 'kloudspeaker/session', 'kloudspeaker/dom', 'kloudspeaker/platform'], function(ki, ui, s, dom, pf) {
            dom.setup();
            pf.setup();
            resolve();
        });
    });
}
