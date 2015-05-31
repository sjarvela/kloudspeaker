define(['kloudspeaker/eventlogging/repository', 'kloudspeaker/core/user/repository', 'kloudspeaker/session', 'kloudspeaker/utils', 'kloudspeaker/ui/texts', 'kloudspeaker/ui/formatters'], function(repository, userRepository, session, utils, texts, formatters) {
    return function() {
        var that = this;
        var model = {
            events: ko.observableArray([])
        };

        var timestampFormatter = new formatters.Timestamp(texts.get('shortDateTimeFormat'));
        var listRefresh = utils.createNotifier();

        return {
            customTitle: true,
            model: model,
            tools: [],
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
                    /*if (model.options.user()) params.user_id = model.options.user().id;
                    if (model.options.itemType()) {
                        params.item = model.options.itemType();
                        params.item_id = null;

                        var item = model.options.item();
                        if (item && (params.item == 'filesystem_item' || params.item == 'filesystem_child'))
                            params.item_id = item.id;
                    }*/
                    return params;
                }, function(l) {
                    return l;
                }),
                refresh: listRefresh
            },
            activate: function(o) {
                repository.getTypes().done(function(t) {
                    //that._types = t;
                });
                userRepository.getAllUsers().done(function(u) {
                    //model.options.users(u);
                });
            }
        };
    };
});
