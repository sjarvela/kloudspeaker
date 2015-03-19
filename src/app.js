import {
    LogManager
}
from 'aurelia-framework';
import {
    Router
}
from 'aurelia-router';
import bootstrap from 'bootstrap';

export class App {
    static inject() {
        return [Router];
    }
    constructor(router) {
        logger = LogManager.getLogger("kloudspeaker");
        logger.info("App init");

        this.router = router;

        this.router.configure(config => {
            config.title = 'Kloudspeaker';
            config.addPipelineStep('authorize', AuthorizeStep);
            config.map([{
                route: ['', 'welcome'],
                moduleId: 'welcome',
                nav: true,
                title: 'Welcome',
                auth: true
            }, {
                route: 'login',
                moduleId: 'login'
            }, {
                route: 'child-router',
                moduleId: 'child-router',
                nav: true,
                title: 'Child Router'
            }]);
        });
    }
}

class AuthorizeStep {
    static inject() {
        return [];
    }
    constructor() {}

    run(routingContext, next) {
        logger = LogManager.getLogger("kloudspeaker");
        logger.info("Route pipeline");
        console.log(routingContext);

        // Check if the route has an "auth" key
        // The reason for using `nextInstructions` is because
        // this includes child routes.
        if (routingContext.nextInstructions.some(i => i.config.auth)) {
            var isLoggedIn = /* insert magic here */ false;
            if (!isLoggedIn) {
                logger.info("Not logged");
                //return next.cancel(new Redirect('login'));
            }

            return next();
        } else {
            return next();
        }
    }
}
