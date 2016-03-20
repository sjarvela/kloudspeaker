define(['kloudspeaker/settings', 'kloudspeaker/filesystem', 'kloudspeaker/plugins', 'kloudspeaker/events', 'kloudspeaker/permissions', 'kloudspeaker/localization', 'kloudspeaker/ui/dialogs', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/ui'], function(settings, fs, plugins, events, permissions, loc, dialogs, utils, dom, ui) {
    var that = {};

    that.onEdit = function(item, spec) {
        ui.showFullscreenPopup({
            model: ['kloudspeaker/fileviewereditor/viewereditor', { item: item, spec: spec, edit: true}]
        });
    };

    that.view = function(item) {
        var doView = function(d) {
            if (!d || !d.plugins || !d.plugins['plugin-fileviewereditor']) return;
            that.onView(item, [], d.plugins['plugin-fileviewereditor']);
        }

        fs.itemDetails(item, plugins.getItemContextRequestData(item)).done(function(d) {
            doView(d);
        });
    };

    that.onView = function(item, all, spec) {
        ui.showFullscreenPopup({
            model: ['kloudspeaker/fileviewereditor/viewereditor', { item: item, spec: spec, view: true}]
        });
    };

    loc.registerPluginResource('FileViewerEditor');
    dom.importCss(plugins.url('FileViewerEditor', 'style.css'));

    plugins.register({
        id: "plugin-fileviewereditor",
        view: that.view,
        canView: function(itemDetails) {
            if (!itemDetails) {
                var df = $.Deferred();
                fs.itemDetails(item, plugins.getItemContextRequestData(item)).done(function(d) {
                    df.resolve(!!(d.plugins && d.plugins["plugin-fileviewereditor"] && d.plugins["plugin-fileviewereditor"].view));
                });
                return df;
            }
            return !!(itemDetails.plugins && itemDetails.plugins["plugin-fileviewereditor"] && itemDetails.plugins["plugin-fileviewereditor"].view);
        },
        itemContextHandler: function(item, ctx, data) {
            if (!data) return false;

            var previewerAvailable = !!data.preview;
            var viewerAvailable = !!data.view;
            var editorAvailable = !!data.edit;

            var result = {
                details: false,
                actions: []
            };
            if (previewerAvailable) {
                result.details = {
                    "title-key": "pluginFileViewerEditorPreview",
                    "on-render": function(el, $content) {
                        $content.empty().addClass("loading");

                        $.ajax({
                            type: 'GET',
                            url: data.preview
                        }).done(function(r) {
                            $content.removeClass("loading").html(r.result.html);
                        });
                    }
                };
            }

            if (viewerAvailable) {
                result.actions.push({
                    id: 'pluginFileViewerEditorView',
                    "title-key": 'pluginFileViewerEditorView',
                    type: "primary",
                    callback: function() {
                        that.onView(item, [], data);
                    }
                });
            }
            if (editorAvailable && permissions.hasFilesystemPermission(item, "filesystem_item_access", "rw", true)) {
                result.actions.push({
                    id: 'pluginFileViewerEditorView',
                    "title-key": 'pluginFileViewerEditorEdit',
                    type: "primary",
                    callback: function() {
                        that.onEdit(item, data);
                    }
                });
            }
            return result;
        }
    });
});
