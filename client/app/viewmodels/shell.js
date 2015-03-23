define(['kloudspeaker/core', 'kloudspeaker/session', 'durandal/app'], function(core, session, da) {
    var router = core.routers.root();

    da.on('session:end').then(function() {
        router.navigate('login');
    });

    router.guardRoute = function(instance, instruction) {
        var user = session.get().user;
        console.log("Guard route");
        console.log(user);
        console.log(instance);
        console.log(instruction);

        if (instruction.fragment == 'login' && user)
            return "files"; //TODO default

        if (!instance || instruction.fragment == 'login' || user) {
            return true;
        }
        console.log("UNAUTHORIZED");

        if (instance.allowUnauthorized) return true;
        return 'login';
    };

    return {
        router: router,
        activate: function() {
            return router.activate();
        }
    };
});
