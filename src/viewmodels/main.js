define(['cloudberry/session', 'cloudberry/core', 'knockout', 'jquery', 'i18next'], function(session, core, ko, $, i18n) {
    var router = core.routers.get('main');

    core.actions.register({
        id: 'session/logout',
        type: 'session',
        titleKey: 'core.action.session.logout',
        handler: function() {
            session.end();
        }
    });

    var model = {
        session: null,

        activeFirstLevelView: ko.observable(null),
        firstLevelViews: ko.observableArray(core.views.get('main')),

        activeSecondLevelView: ko.observable(null),
        secondLevelViews: ko.observableArray([]),

        subviews: ko.observable(null)
    };

    router.on('router:navigation:complete').then(function(instance, instruction, router) {
        var parts = instruction.fragment.split("/");
        var firstLevel = parts[0];
        var secondLevel = (parts.length > 1) ? parts[1] : null;

        console.log("active=" + firstLevel + " / " + secondLevel);

        model.activeFirstLevelView(core.views.getById(firstLevel));
        model.activeSecondLevelView(secondLevel ? core.views.getById(secondLevel) : null);
        model.secondLevelViews(core.views.get(firstLevel) || []);

        if (instruction.config.subViewTemplates)
            model.subviews({ templates: instruction.config.subViewTemplates, model: instance });
        else
            model.subviews(null);
    });

    return {
        router: router,
        activate: function() {
            model.session = session.get();
        },
        core: core,
        model: model,
        t: function(o) {
            if (!o) return "";
            if (typeof(o) == 'string') return i18n.t(o);
            if (o['title-key']) return i18n.t(o['title-key']);
            if (o.title) return o.title;
            return "";
        }
    };
});
