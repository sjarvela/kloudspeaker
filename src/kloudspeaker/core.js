define(['plugins/router', 'kloudspeaker/filesystem'],
    function(router, fs) {
        var views = {};
        var viewsById = {};
        var actions = {};
        var actionsById = {};
        var routers = {
            '_': false
        };

        var actionTrigger = function() {
            this.handler();
        };

        var mapViewsToRouter = function(router, views) {
            router.map(views).buildNavigationModel();
        }

        var core = {
            views: {
                register: function(v) {
                    var parent = v.parent || '_';
                    if (views[parent] === undefined) views[parent] = [];
                    views[parent].push(v);
                    viewsById[v.id] = v;
                },
                getById: function(id) {
                    if (!id) return null;
                    return viewsById[id];
                },
                get: function(parent) {
                    return views[parent || '_'] || [];
                }
            },
            actions: {
                register: function(ac) {
                    var t = ac.type || '_';
                    if (actions[t] === undefined) actions[t] = [];
                    actions[t].push(ac);
                    actionsById[ac.id] = ac;
                    ac.trigger = actionTrigger;
                },
                get: function(type) {
                    return actions[type || '_'] || [];
                },
                getById: function(id) {
                    if (!id) return null;
                    return actionsById[id];
                },
                trigger: function(ac, subj, ctx) {
                    if (!ac) return;
                    if (typeof(ac) == 'string') ac = actionsById[ac];
                    if (!ac || !ac.handler) return;

                    // inject handler params
                    //var fn = window.isArray(ac.handler) ? ac.handler[ac.handler.length - 1] : ac.handler;
                    //var deps = [];
                    var args = [subj, ctx];
                    //if (window.isArray(ac.handler) && ac.handler.length > 1)
                    //    for (var i = 0; i <= ac.handler.length - 2; i++) args.push($injector.get(ac.handler[i]));
                    ac.handler.apply(null, args);
                }
            },
            routers: {
                root: function() {
                    if (!routers['_']) {
                        routers['_'] = router;
                        mapViewsToRouter(router, core.views.get());
                    }
                    return routers['_'];
                },
                get: function(id) {
                    if (!id) return this.root();

                    if (!routers[id]) {
                        var parent = (id == 'main') ? core.routers.root() : core.routers.get('main');
                        routers[id] = parent.createChildRouter();
                        mapViewsToRouter(routers[id], core.views.get(id));
                    }
                    return routers[id];
                }
            }
        }

        // full
        core.views.register({
            id: 'login',
            route: 'login',
            moduleId: 'viewmodels/login'
        });
        core.views.register({
            route: '*details',
            moduleId: 'viewmodels/main',
            nav: true
        });

        // main
        core.views.register({
            id: 'files',
            icon: 'file',
            parent: 'main',
            route: 'files(/:id)',
            moduleId: 'viewmodels/main/files',
            subViewTemplates: {
                nav: 'views/main/files/nav',
                tools: 'views/main/files/tools'
            },
            titleKey: 'main.files.title',
            hash: "#files",
            nav: true
        });
        core.views.register({
            id: 'config',
            icon: 'cog',
            parent: 'main',
            route: 'config*details',
            moduleId: 'viewmodels/main/config',
            titleKey: 'main.config.title',
            hash: "#config",
            nav: true
        });
        return core;
    });
