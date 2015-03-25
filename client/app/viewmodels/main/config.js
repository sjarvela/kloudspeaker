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

    /*childRouter.mapUnknownRoutes(function(instruction) {
        console.log("UNKNOWN");
        console.log(instruction);
        //use the instruction to conventionally configure a module
    }).buildNavigationModel();*/

    return {
        router: router
    };
});
