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
     *  Trash bin -plugin
     **/
    var TrashBinPlugin = function() {
        var that = this;

        this.initialize = function() {
            var onSession = function() {
                that._softDelete = (kloudspeaker.session && kloudspeaker.session.data.plugins["TrashBin"] && kloudspeaker.session.data.plugins["TrashBin"]["soft_delete"]);
            };
            kloudspeaker.events.addEventHandler(onSession, "session/start");
            if (kloudspeaker.session) onSession();
        };

        this._onDrop = function(items) {
            var many = (window.isArray(items) && items.length > 1);
            var single = many ? null : (window.isArray(items) ? items[0] : items);

            var title = many ? kloudspeaker.ui.texts.get("deleteManyConfirmationDialogTitle") : (single.is_file ? kloudspeaker.ui.texts.get("deleteFileConfirmationDialogTitle") : kloudspeaker.ui.texts.get("deleteFolderConfirmationDialogTitle"));
            var msg = many ? kloudspeaker.ui.texts.get("confirmDeleteManyMessage", items.length) : kloudspeaker.ui.texts.get(single.is_file ? "confirmFileDeleteMessage" : "confirmFolderDeleteMessage", [single.name]);

            var df = $.Deferred();
            kloudspeaker.ui.dialogs.confirmation({
                title: title,
                message: msg,
                callback: function() {
                    $.when(kloudspeaker.filesystem.del(items)).then(df.resolve, df.reject);
                }
            });
            return df.promise();
        };

        this._onFileViewInit = function(fv) {
            that._fileView = fv;
            that.$el = $('<div id="kloudspeaker-trashbin" style="display: none"><i class="icon-trash drop-target"></i></div>').appendTo($("body"));
            
            kloudspeaker.ui.draganddrop.enableDrop(that.$el.find(".drop-target"), {
                canDrop: function($e, e, obj) {
                    if (!obj || obj.type != 'filesystemitem') return false;
                    return true;
                },
                dropType: function($e, e, obj) {
                    if (!obj || obj.type != 'filesystemitem') return false;
                    return "move";
                },
                onDrop: function($e, e, obj) {
                    if (!obj || obj.type != 'filesystemitem') return;
                    var items = obj.payload;
                    that._onDrop(items);
                }
            });

            if (!that._softDelete) return;

            that.$el.click(function() {
                that._fileView.changeToFolder('trash/');
            });

            that._fileView.addCustomFolderType("trash", {
                onSelectFolder: function(id) {
                    var df = $.Deferred();
                    kloudspeaker.service.post("trash/data", {
                        rq_data: that._fileView.getDataRequest()
                    }).done(function(r) {
                        //that._collectionsNav.setActive(r.ic);

                        var fo = {
                            type: "trash",
                            id: "",
                            name: kloudspeaker.ui.texts.get('pluginTrashBinViewTitle')
                        };
                        var data = {
                            items: r.items,
                            data: r.data
                        };
                        df.resolve(fo, data);
                    });

                    return df.promise();
                },

                onFolderDeselect: function(f) {
                    //that._collectionsNav.setActive(false);
                },

                onRenderFolderView: function(f, data, $h, $tb) {
                    kloudspeaker.dom.template("kloudspeaker-tmpl-fileview-header-custom", {
                        folder: f
                    }).appendTo($h);

                    var opt = {
                        title: function() {
                            return this.data.title ? this.data.title : kloudspeaker.ui.texts.get(this.data['title-key']);
                        }
                    };
                    var $fa = $("#kloudspeaker-fileview-folder-actions");
                    var actionsElement = kloudspeaker.dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                        icon: 'icon-cog',
                        dropdown: true
                    }, opt).appendTo($fa);
                    kloudspeaker.ui.controls.dropdown({
                        element: actionsElement,
                        items: that._getItemActions(data),
                        hideDelay: 0,
                        style: 'submenu'
                    });
                    that._fileView.addCommonFileviewActions($fa);
                }
            });
        };

        this._getItemActions = function(d) {
            return [];
        };

        this._onFileViewActivate = function($mv, h) {
            //that._fileView = fv;
            console.log("trash bin act");
            that.$el.show();
        };

        this._onFileViewDeactivate = function($mv, h) {
            //that._fileView = fv;
            console.log("trash bin deact");
            that.$el.hide();
        };

        return {
            id: "plugin-trashbin",
            backendPluginId: "TrashBin",
            initialize: that.initialize,
            resources: {
                texts: false,
                css: true
            },
            fileViewHandler: {
                onInit: that._onFileViewInit,
                onActivate: that._onFileViewActivate,
                onDeactivate: that._onFileViewDeactivate
            }
        };
    }

    kloudspeaker.plugins.register(new TrashBinPlugin());
}(window.jQuery, window.kloudspeaker);
