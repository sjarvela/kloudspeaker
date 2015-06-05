define(['kloudspeaker/eventlogging/repository', 'kloudspeaker/core/user/repository', 'kloudspeaker/session', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/formatters'], function(repository, userRepository, session, utils, texts, formatters) {
    return function() {
        var that = this;
        that._eventTypeTexts = {};
        var model = {
            events: ko.observableArray([]),

            options: {
                eventType: ko.observable(null),
                eventTypeNoneTitle: texts.get('pluginEventLoggingAdminAny'),
                eventTypes: ko.observableArray([]),
                eventTypeOptionTitle: function(t) {
                    if (t == "custom") return texts.get('pluginEventLoggingAdminEventTypeCustom');
                    return that._eventTypeTexts[t] + " (" + t + ")";
                },
                customEventType: ko.observable(''),

                user: ko.observable(null),
                userNoneTitle: texts.get('pluginShareAdminAny'),
                users: ko.observableArray([]),
                userOptionTitle: function(u) {
                    return u.name;
                },

                start: ko.observable(null),
                end: ko.observable(null),

                itemPath: ko.observable(''),
            },

            view: ko.observable(null),
            restrictConfigList: ko.observable(false)
        };

        var timestampFormatter = new formatters.Timestamp(texts.get('shortDateTimeFormat'));
        var listRefresh = utils.createNotifier();

        var viewEvent = function(e) {
            if (e) {
                if (!e.details) e.details = [];
                else if (typeof(e.details) === "string") {
                    var details = e.details;
                    var d = [];

                    _.each(details.split(';'), function(dr) {
                        var p = dr.split('=');
                        d.push({
                            title: p[0],
                            value: p[1]
                        });
                    });
                    e._details = details;
                    e.details = d;
                }
            }
            model.view(e);
        };

        return {
            customTitle: true,
            model: model,
            tools: [{
                id: "action-refresh",
                icon: 'refresh',
                action: listRefresh.trigger
            }],
            cols: [{
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
                formatter: timestampFormatter,
                sortable: true
            }, {
                id: "ip",
                titleKey: 'pluginEventLoggingIPTitle',
                sortable: true
            }, {
                id: 'view',
                type: 'action',
                icon: 'eye-open',
                title: '',
                action: viewEvent
            }],
            remote: {
                handler: repository.getQueryHandler(function() {
                    var params = {};
                    if (model.options.eventType()) {
                        params.type = model.options.eventType();
                        if (params.type == 'custom') params.type = model.options.customEventType();
                    }
                    if (model.options.user()) params.user = model.options.user().name;
                    if (model.options.start()) params.start_time = model.options.start();
                    if (model.options.end()) params.end_time = model.options.end();
                    if (model.options.itemPath()) params.item_path = model.options.itemPath();

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
                        that._eventTypeTexts[t] = types[t];
                    });
                    list.push("custom");
                    model.options.eventTypes(list);
                });
                userRepository.getAllUsers().done(function(u) {
                    model.options.users(u);
                });
            },
            attached: function(e) {
                var $e = $(e);
                model.view.subscribe(function(v) {
                    model.restrictConfigList(!!v);
                });
            }
        };
    };
});
