define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/localization', 'kloudspeaker/ui/dialogs'], function(settings, plugins, loc, dialogs) {
    plugins.register({
        id: "plugin-sendviaemail",
        backendPluginId: "SendViaEmail",
        resources: {
            texts: true
        },

        itemContextHandler: function(item, ctx, data) {
            if (!item.is_file) return false;
            return {
                actions: [{
                    'title-key': 'actionSendViaEmailSingle',
                    callback: function() {
                        return dialogs.custom({
                            model: ['kloudspeaker/sendviaemail/views/send', {
                                item: item
                            }]
                        });
                    }
                }]
            };
        },
        itemCollectionHandler: function(items) {
            //TODO support multiple files
            return false;

            var folder = false;
            $.each(items, function(i, itm) {
                if (!itm.is_file) {
                    folder = true;
                    return false;
                }
            });
            if (folder) return false;

            return {
                actions: [{
                    'title-key': 'actionSendViaEmailMultiple',
                    callback: function() {
                        return dialogs.custom({
                            model: ['kloudspeaker/sendviaemail/views/send', {
                                items: items
                            }]
                        });
                    }
                }]
            };
        }
    });
});
