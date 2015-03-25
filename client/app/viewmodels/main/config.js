define(['kloudspeaker/core', 'knockout'], function(core, ko) {
    console.log("Config route");

    core.views.register({
        id: 'users',
        icon: 'user',
        parent: 'config',
        route: 'config/users(/:id)',
        moduleId: 'viewmodels/main/config/users',
        titleKey: 'main.config.users.title',
        hash: "#config/users",
        nav: true
    });

    var router = core.routers.get('config');
    router.mapUnknownRoutes(function(instruction) {
        var views = core.views.get('config');
        if (views.length > 0) router.navigate("config/" + views[0].id);
        else router.navigate("config/none");
        
        return { then: function() {} };
    });

    return {
        activate: function(id) {
            console.log("config " + id);
            if (id == null) {
                return false;
            }
        },
        router: router,
        activeView: core.activeView
    };
});
