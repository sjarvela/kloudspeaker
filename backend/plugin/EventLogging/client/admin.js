define(['kloudspeaker/eventlogging/repository', 'kloudspeaker/core/user/repository', 'kloudspeaker/session', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/formatters'], function(repository, userRepository, session, utils, texts, formatters) {
    return function() {
        var that = this;
        var model = {
            events: ko.observableArray([]),
            options: {
                eventType: ko.observable(null),
                eventTypeNoneTitle: texts.get('pluginEventLoggingAdminAny'),
                eventTypes: ko.observableArray([]),
                customEventType: ko.observable(''),

                user: ko.observable(null),
                userNoneTitle: texts.get('pluginShareAdminAny'),
                users: ko.observableArray([]),
                userOptionTitle: function(u) {
                    return u.name;
                },
            }
        };

        var timestampFormatter = new formatters.Timestamp(texts.get('shortDateTimeFormat'));
        var listRefresh = utils.createNotifier();

        return {
            customTitle: true,
            model: model,
            tools: [{
                id: "action-refresh",
                icon: 'refresh',
                action: listRefresh.trigger
            }],
            cols: [{
                type: 'select',
            }, {
                id: "id",
                titleKey: 'configAdminTableIdTitle'
            }, {
                id: "type",
                titleKey: 'pluginEventLoggingEventTypeTitle'
            }, {
                id: "user",
                titleKey: 'pluginEventLoggingUserTitle',
                sortable: true
            }, {
                id: "time",
                titleKey: 'pluginEventLoggingTimeTitle',
                formatter: that._timestampFormatter,
                sortable: true
            }, {
                id: "ip",
                titleKey: 'pluginEventLoggingIPTitle',
                sortable: true
            }],
            remote: {
                handler: repository.getQueryHandler(function() {
                    var params = {};
                    if (model.options.eventType()) {
                        params.type = model.options.eventType();
                        if (params.type == 'custom') params.type = model.options.customEventType();
                    }
                    if (model.options.user()) params.user = model.options.user().name;

                    return params;
                }, function(l) {
                    return l;
                }),
                refresh: listRefresh
            },
            activate: function(o) {
                repository.getTypes().done(function(types) {
                    var list = [];
                    _.each(utils.getKeys(types), function(t) {
                        list.push(t);
                    });
                    list.push("custom");
                    model.options.eventTypes(list);
                });
                userRepository.getAllUsers().done(function(u) {
                    model.options.users(u);
                });
            }
        };
    };
});
