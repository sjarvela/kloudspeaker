define(['kloudspeaker/service', 'kloudspeaker/session', 'kloudspeaker/utils'], function(service, session, utils) {
    return function() {
        var model = {
            trash: ko.observable(null),
        };
        var listRefresh = utils.createNotifier();
        var onEmpty = function() {

        };

        return {
            customTitle: true,
            model: model,
            tools: [],
            cols: [{
                id: 'id',
                titleKey: 'main.config.list.id'
            }, {
                id: 'name',
                titleKey: 'user.name'
            }, {
                id: 'email',
                titleKey: 'user.email'
            }, {
                id: 'empty',
                type: 'action',
                icon: 'trash',
                title: '',
                action: onEmpty
            }],
            activate: function() {
                service.get("trash/users", function(r) {

                });
            }
        };
    };
});
