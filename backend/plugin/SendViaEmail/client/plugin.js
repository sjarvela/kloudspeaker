/**
 * plugin.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict"; // jshint ;_;

    /**
     *  Send via email -plugin
     **/
    var SendViaEmailPlugin = function() {
        var that = this;

        this.initialize = function() {};

        return {
            id: "plugin-sendviaemail",
            backendPluginId: "SendViaEmail",
            initialize: that.initialize,
            resources: {
                texts: true
            },

            itemContextHandler: function(item, ctx, data) {
                if (!item.is_file) return false;
                return {
                    actions: [{
                        'title-key': 'actionSendViaEmailSingle',
                        callback: function() {}
                    }]
                };
            },
            itemCollectionHandler: function(items) {
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
                        callback: function() {}
                    }]
                };
            }
        };
    }

    kloudspeaker.plugins.register(new SendViaEmailPlugin());
}(window.jQuery, window.kloudspeaker);
