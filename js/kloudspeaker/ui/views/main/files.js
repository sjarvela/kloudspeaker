define(['kloudspeaker/instance', 'kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/localization', 'kloudspeaker/service', 'kloudspeaker/request', 'kloudspeaker/features', 'kloudspeaker/events', 'kloudspeaker/permissions', 'kloudspeaker/plugins', 'kloudspeaker/filesystem', 'kloudspeaker/ui/views/main/files/filelist', 'kloudspeaker/ui/views/main/files/iconview', 'kloudspeaker/ui/uploader', 'kloudspeaker/ui/dnd', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/utils', 'kloudspeaker/ui'], function(app, settings, session, loc, service, request, features, events, permissions, plugins, fs, FileList, IconView, uploader, dnd, formatters, controls, dialogs, dom, utils, ui) {
    return function() {
        var that = this;
        that.viewId = "files";

        that._currentFolder = false;
        that._currentFolderData = false;
        that._viewStyle = 0;
        that._selected = [];
        that._customFolderTypes = {};
        that._selectedItems = [];
        that._formatters = {
            byteSize: new formatters.ByteSize(new formatters.Number(2, false, loc.get('decimalSeparator'))),
            timestamp: new formatters.Timestamp(loc.get('shortDateTimeFormat')),
            uploadSpeed: new formatters.Number(1, loc.get('dataRateKbps'), loc.get('decimalSeparator'))
        };

        that._filelist = {
            columns: [],
            addColumn: function(c) {
                that._filelist.columns[c.id] = c;
            }
        };

        // spec
        that._filelist.addColumn({
            "id": "name",
            "title-key": "fileListColumnTitleName",
            "sort": function(i1, i2, sort, data) {
                return i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()) * sort;
            },
            "content": function(item, data) {
                return item.name;
            },
            "value-title": function(item, data) {
                return item.name;
            }
        });
        that._filelist.addColumn({
            "id": "path",
            "title-key": "fileListColumnTitlePath",
            "sort": function(i1, i2, sort, data) {
                var p1 = fs.rootsById[i1.root_id].name + i1.path;
                var p2 = fs.rootsById[i2.root_id].name + i2.path;
                return p1.toLowerCase().localeCompare(p2.toLowerCase()) * sort;
            },
            "content": function(item, data) {
                return '<span class="item-path-root">' + fs.rootsById[item.root_id].name + '</span>: <span class="item-path-val">' + item.path + '</span>';
            }
        });
        that._filelist.addColumn({
            "id": "type",
            "title-key": "fileListColumnTitleType",
            "sort": function(i1, i2, sort, data) {
                var e1 = i1.is_file ? (i1.extension || '') : '';
                var e2 = i2.is_file ? (i2.extension || '') : '';
                return e1.toLowerCase().localeCompare(e2.toLowerCase()) * sort;
            },
            "content": function(item, data) {
                return item.is_file ? (item.extension || '') : '';
            }
        });
        that._filelist.addColumn({
            "id": "size",
            "title-key": "fileListColumnTitleSize",
            "min-width": 75,
            "sort": function(i1, i2, sort, data) {
                var s1 = (i1.is_file ? parseInt(i1.size, 10) : 0);
                var s2 = (i2.is_file ? parseInt(i2.size, 10) : 0);
                return (s1 - s2) * sort;
            },
            "content": function(item, data) {
                return item.is_file ? that._formatters.byteSize.format(item.size) : '';
            }
        });
        that._filelist.addColumn({
            "id": "file-modified",
            "request-id": "core-file-modified",
            "title-key": "fileListColumnTitleLastModified",
            "width": 180,
            "sort": function(i1, i2, sort, data) {
                if (!i1.is_file && !i2.is_file) return 0;
                if (!data || !data["core-file-modified"]) return 0;

                var ts1 = data["core-file-modified"][i1.id] ? data["core-file-modified"][i1.id] * 1 : 0;
                var ts2 = data["core-file-modified"][i2.id] ? data["core-file-modified"][i2.id] * 1 : 0;
                return ((ts1 > ts2) ? 1 : -1) * sort;
            },
            "content": function(item, data) {
                if (!item.id || !item.is_file || !data || !data["core-file-modified"] || !data["core-file-modified"][item.id]) return "";
                return that._formatters.timestamp.format(utils.parseInternalTime(data["core-file-modified"][item.id]));
            }
        });
        that._filelist.addColumn({
            "id": "item-description",
            "request-id": "item-metadata",
            "title-key": "fileListColumnTitleDescription",
            "sort": function(i1, i2, sort, data) {
                if (!i1.is_file && !i2.is_file) return 0;
                if (!data || !data["item-metadata"]) return 0;

                var d1 = (data["item-metadata"][i1.id] && data["item-metadata"][i1.id].description) ? data["item-metadata"][i1.id].description : '';
                var d2 = (data["item-metadata"][i2.id] && data["item-metadata"][i2.id].description) ? data["item-metadata"][i2.id].description : '';
                return ((d1 > d2) ? 1 : -1) * sort;
            },
            "content": function(item, data) {
                if (!item.id || !data || !data["item-metadata"] || !data["item-metadata"][item.id]) return "";
                var md = data["item-metadata"][item.id];
                if (!md.description) return "";

                var desc = md.description;
                var stripped = desc.replace(/<\/?[^>]+(>|$)/g, '');
                return '<div class="item-description-container" title="' + stripped + '">' + desc + '</div>';
            }
        });
        that._filelist.addColumn({
            "id": "go-into-folder",
            "title": "",
            "width": 25,
            "sort": function(i1, i2, sort, data) {
                return 0;
            },
            "content": function(item, data) {
                if (item.is_file) return "";
                return '<div class="go-into-folder"><i class="fa fa-level-down"></i></div>';
            },
            "on-init": function(list) {
                list.$i.delegate(".go-into-folder", "click", function(e) {
                    var item = list.getItemForElement($(this));
                    if (!item || item.is_file) return;
                    that.changeToFolder(item);
                    return false;
                });
            }
        });

        that.init = function(mainview) {
            that._mainview = mainview;
            that.title = loc.get('mainviewMenuTitle');
            that.icon = "file-o";
            that._viewStyle = 0;
            if (settings["file-view"]["default-view-mode"] == "small-icon") that._viewStyle = 1;
            if (settings["file-view"]["default-view-mode"] == "large-icon") that._viewStyle = 2;

            events.addEventHandler(that.onEvent, false, 'fileview');

            // TODO add module registration
            that.addCustomFolderType("search", {
                onSelectFolder: function(f) {
                    var df = $.Deferred();
                    if (!f) return df.resolve({
                        type: "search",
                        id: ""
                    }, {
                        items: [],
                        info: []
                    });

                    var text = decodeURIComponent(f);
                    service.post("filesystem/search", {
                        text: text,
                        rq_data: that.getDataRequest()
                    }).done(function(r) {
                        var items = [];
                        for (var id in r.matches) {
                            items.push(r.matches[id].item);
                        }
                        var fo = {
                            id: f,
                            type: "search"
                        };
                        var data = {
                            text: text,
                            items: items,
                            data: r.data,
                            info: r
                        };
                        df.resolve(fo, data);
                    });
                    return df.promise();
                },

                onRenderFolderView: function(f, fi, $h, $tb) {
                    dom.template("kloudspeaker-tmpl-main-searchresults", {
                        folder: f,
                        info: fi
                    }).appendTo($h);
                    $("#kloudspeaker-searchresults-title-text").text(loc.get('mainViewSearchResultsTitle', ["" + fi.info.count]));
                    $("#kloudspeaker-searchresults-desc-text").text(loc.get('mainViewSearchResultsDesc', [fi.text]));

                    var $fa = $("#kloudspeaker-fileview-folder-actions");
                    that.addCommonFileviewActions($fa);
                },

                onItemListRendered: function(f, fi, items) {
                    // tooltips
                    var matchList = function(l) {
                        var r = "";
                        var first = true;
                        $.each(l, function(i, li) {
                            if (!first) r = r + ", ";
                            r = r + loc.get('mainViewSearchResultTooltipMatchType_' + li.type);
                            first = false;
                        });
                        return r;
                    };
                    var matchesTitle = loc.get('mainViewSearchResultTooltipMatches');
                    $(".kloudspeaker-filelist-item").each(function() {
                        var $i = $(this);
                        var item = $i.tmplItem().data;
                        var title = fs.rootsById[item.root_id].name + '/' + item.path + ', ' + matchesTitle + matchList(fi.info.matches[item.id].matches);

                        controls.tooltip($i, {
                            title: title
                        });
                    });
                }
            });

            $.each(plugins.getFileViewPlugins(), function(i, p) {
                if (p.fileViewHandler.onInit) p.fileViewHandler.onInit(that);

                if (!p.fileViewHandler.filelistColumns) return;
                var cols = p.fileViewHandler.filelistColumns();
                if (!cols) return;

                for (var j = 0; j < cols.length; j++)
                    that._filelist.addColumn(cols[j]);
            });

            _.each(ui._fileViewHandlers, function(h) {
                if (h.onInit) h.onInit(that);

                if (!h.filelistColumns) return;
                var cols = h.filelistColumns();
                if (!cols) return;

                for (var j = 0; j < cols.length; j++)
                    that._filelist.addColumn(cols[j]);
            });

            require([settings['file-view']['item-context-module']], function(ic) {
                that.itemContext = ic;
            });
        }

        that.deinit = function() {
            events.removeEventHandler('fileview');
        }

        that.addCustomFolderType = function(id, h) {
            that._customFolderTypes[id] = h;
        }

        that.onResize = function() {}

        that.onActivate = function(h) {
            dom.template("kloudspeaker-tmpl-fileview").appendTo(h.content);
            that.showProgress();
            // TODO expose file urls

            var navBarItems = [];
            $.each(fs.roots, function(i, f) {
                navBarItems.push({
                    title: f.name,
                    obj: f,
                    callback: function() {
                        that.changeToFolder(f);
                    }
                })
            });
            that.rootNav = h.addNavBar({
                title: loc.get("mainViewRootsTitle"),
                items: navBarItems,
                onRender: dnd ? function($nb, $items, objs) {
                    dnd.enableDrop($items, {
                        canDrop: function($e, e, obj) {
                            if (!obj || obj.type != 'filesystemitem') return false;
                            var item = obj.payload;
                            var me = objs($e);
                            return that.canDragAndDrop(me, item);
                        },
                        dropType: function($e, e, obj) {
                            if (!obj || obj.type != 'filesystemitem') return false;
                            var item = obj.payload;
                            var me = objs($e);
                            return that.dropType(me, item);
                        },
                        onDrop: function($e, e, obj) {
                            if (!obj || obj.type != 'filesystemitem') return;
                            var item = obj.payload;
                            var me = objs($e);
                            that.onDragAndDrop(me, item);
                        }
                    });
                } : false
            });

            that.initViewTools(h.tools);
            that.initList();

            that.uploadProgress = new UploadProgress($("#kloudspeaker-mainview-progress"));
            that._dndUploader = false;

            if (uploader && uploader.initDragAndDropUploader) {
                that._dndUploader = uploader.initDragAndDropUploader({
                    container: app.getElement(),
                    dropElement: $("#kloudspeaker-folderview"),
                    handler: that._getUploadHandler()
                });
            }

            that._scrollOutThreshold = 100000;
            that._scrollInThreshold = 0;
            $(window).bind('scroll', that._updateScroll);

            $.each(plugins.getFileViewPlugins(), function(i, p) {
                if (p.fileViewHandler.onActivate)
                    p.fileViewHandler.onActivate(app.getElement(), h);
            });
            _.each(ui._fileViewHandlers, function(fvh) {
                if (fvh.onActivate)
                    fvh.onActivate(app.getElement(), h);
            });

            if (fs.roots.length === 0) {
                that.showNoRoots();
                return;
            }

            var subviews = [];
            _.each(fs.roots, function(r) {
                subviews.push({
                    title: r.name,
                    icon: 'folder',
                    item: r
                });
            })

            h.mainview.showSubviewList(subviews, function(f) {
                that.changeToFolder(f.item);
            });

            var params = request.getParams();
            if (params.path) {
                fs.findFolder({
                    path: params.path
                }, that.getDataRequest()).done(function(r) {
                    var folder = r.folder;
                    that.changeToFolder(folder);
                }).fail(function(e) {
                    if (e.code == 203) {
                        dialogs.error({
                            message: loc.get('mainviewFolderNotFound', params.path)
                        });
                        that.handled = true;
                    }
                    that.hideProgress();
                    that.openInitialFolder();
                });
                return;
            }

            if (h.id) {
                that.changeToFolder(h.id.join("/")).fail(function() {
                    that.handled = true;
                    //TODO show error message that folder was not found?
                    that.hideProgress();
                    that.openInitialFolder();
                });
            } else
                that.openInitialFolder();
        };

        that.onRestoreView = function(id) {
            that.changeToFolder(id.join("/"), true);
        };

        that._getUploadHandler = function(c) {
            return {
                isUploadAllowed: function(files) {
                    if (!files) return false;
                    var allowed = true;
                    $.each(files, function(i, f) {
                        var fn = files[i].name;
                        if (!fn) return;

                        var ext = fn.split('.').pop();
                        if (!ext) return;

                        var s = session.get();
                        ext = ext.toLowerCase();
                        if (s.data.filesystem.forbidden_file_upload_types.length > 0 && s.data.filesystem.forbidden_file_upload_types.indexOf(ext) >= 0) allowed = false;

                        if (s.data.filesystem.allowed_file_upload_types.length > 0 && s.data.filesystem.allowed_file_upload_types.indexOf(ext) < 0) allowed = false;
                    });
                    if (!allowed) {
                        dialogs.notification({
                            message: loc.get('mainviewFileUploadNotAllowed'),
                            type: "warning"
                        });
                    }
                    return allowed;
                },
                start: function(files, ready, cancel) {
                    that.uploadProgress.show(loc.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length), function() {
                        ready();
                    }, cancel);
                },
                progress: function(pr, br) {
                    var speed = "";
                    if (br) speed = that._formatters.uploadSpeed.format(br / 1024);
                    that.uploadProgress.set(pr, speed);
                },
                finished: function() {
                    if (c) c.close();
                    that.uploadProgress.hide();
                    dialogs.notification({
                        message: loc.get('mainviewFileUploadComplete'),
                        type: "success"
                    });
                    that.refresh();
                },
                aborted: function(f) {
                    if (c) c.close();
                    that.uploadProgress.hide();
                    dialogs.notification({
                        message: loc.get('mainviewFileUploadAborted'),
                        type: "info"
                    });
                    that.refresh();
                },
                failed: function(f, e) {
                    if (c) c.close();
                    that.uploadProgress.hide();
                    if (e && e.code == 109 && e.data && e.data.items) {
                        ui.actions.handleDenied('upload', e.data, loc.get('actionDeniedUpload'), false);
                    } else {
                        dialogs.notification({
                            message: loc.get('mainviewFileUploadFailed'),
                            type: "error"
                        });
                    }
                },
                fileStatus: function(name, size) {
                    if (!settings["resume-upload"] || !name || !that._currentFolder || that._currentFolder.type) return;

                    var df = $.Deferred();
                    service.post('filesystem/' + that._currentFolder.id + "/fileinfo", {
                        files: [name]
                    }).done(function(r) {
                        if (!r || !r[name]) df.resolve(false);  //don't resume
                        else if (r[name].size >= size) df.resolve(false); //file is already bigger, don't resume
                        else df.resolve(r[name].size);
                    });
                    return df;
                }
            };
        };

        that._updateScroll = function() {
            var s = $(window).scrollTop();
            var $e = $("#kloudspeaker-folderview");

            var isDetached = $e.hasClass("detached");
            var toggle = (!isDetached && s > that._scrollOutThreshold) || (isDetached && s < that._scrollInThreshold);
            if (!toggle) return;

            if (!isDetached) $("#kloudspeaker-folderview").addClass("detached");
            else $("#kloudspeaker-folderview").removeClass("detached");
        };

        that.openInitialFolder = function() {
            if (fs.roots.length === 0) that.showNoRoots();
            else if (fs.roots.length == 1) that.changeToFolder(fs.roots[0]);
            else that.changeToFolder(null);
        };

        that.onDeactivate = function() {
            $(window).unbind('scroll');

            if (that._dndUploader) that._dndUploader.destroy();

            $.each(plugins.getFileViewPlugins(), function(i, p) {
                if (p.fileViewHandler.onDeactivate)
                    p.fileViewHandler.onDeactivate();
            });
            _.each(ui._fileViewHandlers, function(fvh) {
                if (fvh.onDeactivate)
                    fvh.onDeactivate();
            });
        };

        that.initViewTools = function($t) {
            dom.template("kloudspeaker-tmpl-fileview-tools").appendTo($t);

            ui.process($t, ["radio"], that);
            that.controls["kloudspeaker-fileview-style-options"].set(that._viewStyle);

            var onSearch = function() {
                var val = $("#kloudspeaker-fileview-search-input").val();
                if (!val || val.length === 0) return;
                $("#kloudspeaker-fileview-search-input").val("");
                that.changeToFolder({
                    type: "search",
                    id: encodeURIComponent(val)
                });
            };
            $("#kloudspeaker-fileview-search-input").keyup(function(e) {
                if (e.which == 13) onSearch();
            });
            $("#kloudspeaker-fileview-search > button").click(onSearch);
        };

        that.getDataRequest = function() {
            var rq = (!that._currentFolder || !that._currentFolder.type) ? {
                'parent-metadata': {}
            } : {};
            $.each(plugins.getFileViewPlugins(), function(i, p) {
                if (p.fileViewHandler.getDataRequest)
                    rq = $.extend(rq, p.fileViewHandler.getDataRequest(that._currentFolder));
            });
            return $.extend(rq, that.itemWidget.getDataRequest ? that.itemWidget.getDataRequest() : {});
        };

        that.updateData = function(hcb) {
            var res = hcb(that._currentFolderData.data);
            if (!res) return;
            if (res === true) that._updateUI();
            else if (utils.isArray(res)) {
                that.itemWidget.updateItems(res, that._currentFolderData.data);
            } else {
                if (res.id && res.id == that._currentFolder.id) that._updateUI();
                else that.itemWidget.updateItems([res], that._currentFolderData.data);
            }
        };

        that.getCurrentFolder = function() {
            return that._currentFolder;
        };

        that.onEvent = function(e) {
            if (!e.type.startsWith('filesystem/')) return;

            if (e.type == "filesystem/item-update") {
                if (!that._currentFolderData) return;

                var item = e.payload.item;
                if (e.payload.property == 'description') {
                    //TODO better way to update data?
                    if (that._currentFolderData.data['item-metadata'] && that._currentFolderData.data['item-metadata'][item.id]) {
                        that._currentFolderData.data['item-metadata'][item.id].description = e.payload.value;
                    }
                } else {
                    if (that._currentFolderData.data[e.payload.property] && that._currentFolderData.data[e.payload.property][item.id])
                        that._currentFolderData.data[e.payload.property][item.id] = e.payload.value;
                }
                that.itemWidget.updateItems([item], that._currentFolderData.data);
                return;
            }
            //var files = e.payload.items;
            //TODO check if affects this view
            that.refresh();
        };

        that.onRadioChanged = function(groupId, valueId, i) {
            if (groupId == "kloudspeaker-fileview-style-options") that.onViewStyleChanged(valueId, i);
        };

        that.onViewStyleChanged = function(id, i) {
            that._viewStyle = i;
            that.initList();
            that.refresh();
        };

        that.showNoRoots = function() {
            //TODO show message, for admin instruct opening admin tool?
            that._currentFolder = false;
            that._currentFolderData = {
                items: fs.roots
            };
            that._updateUI();
        };

        that.showProgress = function() {
            $("#kloudspeaker-folderview-items").addClass("loading");
        };

        that.hideProgress = function() {
            $("#kloudspeaker-folderview-items").removeClass("loading");
        };

        that.changeToFolder = function(f, noStore) {
            var id = f;
            if (!id) {
                if (fs.roots)
                    id = fs.roots[0].id;
            } else if (typeof(id) != "string") id = that._getFolderPublicId(id);

            if (!noStore) app.storeView("files/" + (id ? id : ""));

            var oldType = (that._currentFolder && that._currentFolder.type) ? that._currentFolder.type : null;
            if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
                if (that._customFolderTypes[that._currentFolder.type].onFolderDeselect)
                    that._customFolderTypes[that._currentFolder.type].onFolderDeselect(that._currentFolder);
            }
            window.scrollTo(0, 0);
            that._selectedItems = [];
            that._currentFolder = false;
            that._currentFolderType = null;
            that._currentFolderData = false;
            that.rootNav.setActive(false);

            if (!id) return $.Deferred().resolve();
            return that._onSelectFolder(id, oldType);
        };

        that._getFolderPublicId = function(f) {
            if (!f) return "";
            if (f.type && that._customFolderTypes[f.type])
                return f.type + "/" + f.id;
            return f.id;
        };

        that._onSelectFolder = function(id, oldType) {
            var onFail = function() {
                that.hideProgress();
            };
            ui.hideActivePopup();
            that.showProgress();

            that._currentFolderType = null;
            var idParts = id ? id.split("/") : [];
            if (idParts.length > 1 && that._customFolderTypes[idParts[0]]) that._currentFolderType = idParts[0];
            if (that._currentFolderType != oldType) that.initList();

            if (that._currentFolderType) {
                return that._customFolderTypes[that._currentFolderType].onSelectFolder(idParts[1]).done(that._setFolder).fail(onFail);
            } else if (!id || idParts.length == 1) {
                return fs.folderInfo(id ? idParts[0] : null, true, that.getDataRequest()).done(function(r) {
                    var folder = r.folder;
                    if (folder && folder.id == folder.root_id && fs.rootsById[folder.id]) folder = fs.rootsById[folder.id];
                    var data = r;
                    data.items = r.folders.slice(0).concat(r.files);
                    if (data.hierarchy && fs.rootsById[data.hierarchy[0].id]) data.hierarchy[0] = fs.rootsById[data.hierarchy[0].id]; //replace root item with user instance

                    that._setFolder(folder, data, oldType);
                }).fail(onFail);
            } else {
                // invalid id, just ignore
                that.hideProgress();
                return $.Deferred().reject();
            }
        };

        that.refresh = function() {
            if (!that._currentFolder) return;
            that._onSelectFolder(that._getFolderPublicId(that._currentFolder));
        };

        that._setFolder = function(folder, data) {
            var rootFolder = (folder && fs.rootsById[folder.root_id]) ? fs.rootsById[folder.root_id] : null;
            that._mainview.setActiveSubview(rootFolder ? {
                icon: 'folder',
                title: rootFolder.name
            } : false);

            that._currentFolder = folder;
            that._currentFolderType = (folder && folder.type) ? folder.type : null;
            that._currentFolderData = data;

            that.hideProgress();
            that._updateUI();
        };

        that._canWrite = function() {
            if (!that._currentFolder) return false;
            return permissions.hasFilesystemPermission(that._currentFolder, "filesystem_item_access", "rw", true);
        }

        that.onRetrieveUrl = function(url) {
            if (!that._currentFolder) return;

            that.showProgress();
            service.post("filesystem/" + that._currentFolder.id + "/retrieve", {
                url: url
            }).done(function(r) {
                that.hideProgress();
                that.refresh();
            }).fail(function(error) {
                that.hideProgress();
                //301 resource not found
                if (error.code == 301) {
                    that.handled = true;
                    dialogs.error({
                        message: loc.get('mainviewRetrieveFileResourceNotFound', [url])
                    });
                }
            });
        };

        that.dragType = function() {
            if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
                if (that._customFolderTypes[that._currentFolder.type].dragType) return that._customFolderTypes[that._currentFolder.type].dragType();
            }
            return "filesystemitem";
        };

        that.dropType = function(to, i) {
            var single = false;
            if (!utils.isArray(i)) single = i;
            else if (i.length == 1) single = i[0];

            if (settings["file-view"] && settings["file-view"]["drop-type"]) {
                var dt = settings["file-view"]["drop-type"];
                var t = typeof(dt);
                if (t == 'function') return dt(to, i);
                else if (t == 'object') {
                    if (single && dt.single) return dt.single;
                    if (!single && dt.multi) return dt.multi;
                } else if (t == 'string') return dt;
            }

            var copy = (!single || to.root_id != single.root_id);
            return copy ? "copy" : "move";
        };

        that.canDragAndDrop = function(to, itm) {
            var single = false;
            if (!utils.isArray(itm)) single = itm;
            else if (itm.length == 1) single = itm[0];

            var droptype = that.dropType(to, itm);

            if (single)
                return (droptype == "copy") ? fs.canCopyTo(single, to) : fs.canMoveTo(single, to);

            var can = true;
            for (var i = 0; i < itm.length; i++) {
                var item = itm[i];
                if (!(droptype == "copy" ? fs.canCopyTo(item, to) : fs.canMoveTo(item, to))) {
                    can = false;
                    break;
                }
            }
            return can;
        };

        that.onDragAndDrop = function(to, itm) {
            var copy = (that.dropType(to, itm) == 'copy');
            //console.log((copy ? "copy " : "move ") +itm.name+" to "+to.name);

            if (copy) fs.copy(itm, to);
            else fs.move(itm, to);
        };

        that._updateUI = function() {
            var opt = {
                title: function() {
                    return that.data.title ? that.data.title : loc.get(that.data['title-key']);
                }
            };
            var $h = $("#kloudspeaker-folderview-header-content").empty();

            if (that._currentFolder && that._currentFolder.type) {
                // prevent custom folder upload (custom folders need to handle it explicitly)
                if (that._dndUploader)
                    that._dndUploader.setUrl(false);

                if (that._customFolderTypes[that._currentFolder.type]) {
                    that._customFolderTypes[that._currentFolder.type].onRenderFolderView(that._currentFolder, that._currentFolderData, $h, $tb);
                }
            } else {
                var currentRoot = (that._currentFolderData && that._currentFolderData.hierarchy) ? that._currentFolderData.hierarchy[0] : false;
                that.rootNav.setActive(currentRoot);

                if (that._currentFolder)
                    dom.template("kloudspeaker-tmpl-fileview-header", {
                        canWrite: that._canWrite(),
                        folder: that._currentFolder
                    }).appendTo($h);
                else
                    dom.template("kloudspeaker-tmpl-main-rootfolders").appendTo($h);

                var $tb = $("#kloudspeaker-fileview-folder-tools").empty();
                var $fa = $("#kloudspeaker-fileview-folder-actions");

                if (that._currentFolder) {
                    if (that._canWrite()) {
                        dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                            icon: 'fa fa-folder'
                        }, opt).appendTo($tb).click(function() {
                            controls.dynamicBubble({
                                element: $(this),
                                content: dom.template("kloudspeaker-tmpl-main-createfolder-bubble"),
                                handler: {
                                    onRenderBubble: function(b) {
                                        var $i = $("#kloudspeaker-mainview-createfolder-name-input");
                                        var onCreate = function() {
                                            var name = $i.val();
                                            if (!name) return;

                                            b.hide();
                                            fs.createFolder(that._currentFolder, name);
                                        };
                                        $("#kloudspeaker-mainview-createfolder-button").click(onCreate);
                                        $i.bind('keypress', function(e) {
                                            if ((e.keyCode || e.which) == 13) onCreate();
                                        }).focus();
                                    }
                                }
                            });
                            return false;
                        });
                        if (uploader) dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                            icon: 'fa fa-upload'
                        }, opt).appendTo($tb).click(function() {
                            controls.dynamicBubble({
                                element: $(this),
                                content: dom.template("kloudspeaker-tmpl-main-addfile-bubble"),
                                handler: {
                                    onRenderBubble: function(b) {
                                        uploader.initUploadWidget($("#kloudspeaker-mainview-addfile-upload"), {
                                            url: fs.getUploadUrl(that._currentFolder),
                                            handler: that._getUploadHandler(b)
                                        });

                                        if (!features.hasFeature('retrieve_url')) {
                                            $("#kloudspeaker-mainview-addfile-retrieve").remove();
                                        }
                                        var onRetrieve = function() {
                                            var val = $("#kloudspeaker-mainview-addfile-retrieve-url-input").val();
                                            if (!val || val.length < 4 || val.substring(0, 4).toLowerCase().localeCompare('http') !== 0) return false;
                                            b.close();
                                            that.onRetrieveUrl(val);
                                        };
                                        $("#kloudspeaker-mainview-addfile-retrieve-url-input").bind('keypress', function(e) {
                                            if ((e.keyCode || e.which) == 13) onRetrieve();
                                        });
                                        $("#kloudspeaker-mainview-addfile-retrieve-button").click(onRetrieve);
                                    }
                                }
                            });
                            return false;
                        });
                    }

                    // FOLDER
                    var actionsElement = dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                        icon: 'fa fa-cog',
                        dropdown: true
                    }, opt).appendTo($fa);
                    controls.dropdown({
                        element: actionsElement,
                        items: false,
                        hideDelay: 0,
                        style: 'submenu',
                        onShow: function(drp, items) {
                            if (items) return;

                            that.getItemActions(that._currentFolder, function(a) {
                                if (!a) {
                                    drp.hide();
                                    return;
                                }
                                drp.items(a);
                            });
                        }
                    });

                    that.setupHierarchy(that._currentFolderData.hierarchy, $tb);

                    that.showProgress();
                }

                if (that._dndUploader)
                    that._dndUploader.setUrl(that._canWrite() ? fs.getUploadUrl(that._currentFolder) : false);
                that.addCommonFileviewActions($fa);
            }

            ui.process($h, ['localize']);

            that._scrollOutThreshold = $("#kloudspeaker-folderview-header").outerHeight() + 40;
            that._scrollInThreshold = that._scrollOutThreshold - 60;
            $("#kloudspeaker-folderview-detachholder").css("height", (that._scrollInThreshold + 40) + "px");
            $("#kloudspeaker-folderview").removeClass("detached");
            that.onResize();
            that._updateSelect();

            // show description
            var descriptionExists = that._currentFolderData.data && that._currentFolderData.data['parent-metadata'];
            if (descriptionExists)
                $("#kloudspeaker-folder-description").text(that._currentFolderData.data['parent-metadata'].description);

            var $dsc = $("#kloudspeaker-folder-description");
            var descriptionEditable = that._currentFolder && !that._currentFolder.type && $dsc.length > 0 && features.hasFeature('descriptions') && permissions.hasFilesystemPermission(that._currentFolder, "edit_description", null, true);
            if (descriptionEditable) {
                controls.editableLabel({
                    element: $dsc,
                    hint: loc.get('mainviewDescriptionHint'),
                    onedit: function(desc) {
                        service.put("filesystem/" + that._currentFolder.id + "/description/", {
                            description: desc
                        }).done(function() {
                            events.dispatch("filesystem/item-update", {
                                item: that._currentFolder,
                                property: 'description',
                                value: desc
                            });
                        });
                    }
                });
            } else {
                if (!descriptionExists) $dsc.hide();
            }

            // update file list
            that._updateList();

            events.dispatch('fileview/init', {
                folder: that._currentFolder,
                data: that._currentFolderData,
                canWrite: that._canWrite(),
                fileview: that
            });

            that.hideProgress();
        };

        that.addCommonFileviewActions = function($c) {
            //TODO kaikki action-luonnit omaan luokkaan
            var opt = {
                title: function() {
                    return that.data.title ? that.data.title : loc.get(that.data['title-key']);
                }
            };

            // SELECT
            that._selectModeBtn = dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                icon: 'fa fa-check-square-o',
                dropdown: true,
                style: "narrow",
                action: true
            }, opt).appendTo($c).click(that._onToggleSelect);
            controls.dropdown({
                element: that._selectModeBtn,
                items: false,
                hideDelay: 0,
                style: 'submenu',
                onShow: function(drp) {
                    that._getSelectionActions(function(a) {
                        if (!a) {
                            drp.hide();
                            return;
                        }
                        drp.items(a);
                    });
                }
            });

            // REFRESH                  
            dom.template("kloudspeaker-tmpl-fileview-foldertools-action", {
                icon: 'fa fa-refresh'
            }, opt).appendTo($c).click(that.refresh);
        };

        that._getViewItems = function() {
            //if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type])
            //  return
            return that._currentFolderData.items;
        };

        that._getSelectionActions = function(cb) {
            var addDefaultActions = function(list) {
                var result = list || [];
                if (result.length > 0)
                    result.unshift({
                        "title": "-"
                    });
                result.unshift({
                    "title-key": "mainViewFileViewSelectNone",
                    callback: function() {
                        that._updateSelect([]);
                    }
                });
                result.unshift({
                    "title-key": "mainViewFileViewSelectAll",
                    callback: function() {
                        that._updateSelect(that._getViewItems());
                    }
                });
                return result;
            };

            if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type] && that._customFolderTypes[that._currentFolder.type].getSelectionActions) {
                that._customFolderTypes[that._currentFolder.type].getSelectionActions(that._selectMode && that._selectedItems.length > 0 ? that._selectedItems : []).done(function(a) {
                    cb(addDefaultActions(a));
                });
                return;
            }

            var result = [];
            if (that._selectMode && that._selectedItems.length > 0) {
                var pl = plugins.getItemCollectionPlugins(that._selectedItems);
                result = utils.getPluginActions(pl);
            }

            cb(addDefaultActions(utils.cleanupActions(result)));
        };

        that._onToggleSelect = function() {
            that._selectMode = !that._selectMode;
            that._updateSelect();
        };

        that._updateSelect = function(sel) {
            if (sel !== undefined) {
                that._selectedItems = sel;
                that._selectMode = true;
            }
            if (that._selectMode)
                that._selectModeBtn.addClass("active");
            else
                that._selectModeBtn.removeClass("active");
            that.itemWidget.setSelectMode(that._selectMode);
            if (that._selectMode) that.itemWidget.setSelection(that._selectedItems);
        };

        that._getRootItems = function() {
            var rootItems = [];
            var rootCb = function(r) {
                return function() {
                    that.changeToFolder(r);
                };
            };
            for (var i = 0, j = fs.roots.length; i < j; i++) {
                var root = fs.roots[i];
                rootItems.push({
                    title: root.name,
                    callback: rootCb(root)
                });
            }
            return rootItems;
        };

        that.setupHierarchy = function(h, $t) {
            var items = h;
            var p = $t.append(dom.template("kloudspeaker-tmpl-fileview-folder-hierarchy", {
                items: items
            }));

            controls.dropdown({
                element: $("#kloudspeaker-folder-hierarchy-item-root"),
                items: that._getRootItems(),
                hideDelay: 0,
                style: 'submenu'
            });

            var $hi = $(".kloudspeaker-folder-hierarchy-item").click(function() {
                var folder = $(this).tmplItem().data;
                that.changeToFolder(folder);
            });

            if (dnd) {
                dnd.enableDrop($hi.find("a"), {
                    canDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return false;
                        var itm = obj.payload;
                        var me = $e.parent().tmplItem().data;
                        return that.canDragAndDrop(me, itm);
                    },
                    dropType: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return false;
                        var itm = obj.payload;
                        var me = $e.tmplItem().data;
                        return that.dropType(me, itm);
                    },
                    onDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return;
                        var itm = obj.payload;
                        var me = $e.parent().tmplItem().data;
                        that.onDragAndDrop(me, itm);
                    }
                });
            }
        };

        that.isListView = function() {
            return that._viewStyle === 0;
        };

        that._handleCustomAction = function(action, item, t) {
            if (!settings["file-view"] || !settings["file-view"].actions) return false;
            var actions = settings["file-view"].actions;
            if (!actions[action] || (typeof(actions[action]) !== "function")) return false;

            var ctx = that._getCtxObj(item, t);
            var response = actions[action](item, ctx);
            if (!response) return false;

            if (typeof(response) == "string") {
                if (response == "open_popup") that.itemContext.open(ctx);
                else if (response == "open_menu") that.showActionMenu(item, ctx.element);
                else if (!item.is_file && response == "go_into_folder") that.changeToFolder(item);
            }
            return true;
        };

        that._getCtxObj = function(item, target) {
            return {
                fileview: that,
                item: item,
                viewtype: that.isListView() ? "list" : "icon",
                target: target,
                element: that.itemWidget.getItemContextElement(item),
                itemElement: that.itemWidget.getItemElement(item),
                panelContainer: that.itemWidget.getPanelContainer(item),
                viewport: that.itemWidget.getContainerElement(),
                container: $("#kloudspeaker-folderview-items"),
                folder: that._currentFolder,
                folder_writable: that._currentFolder ? permissions.hasFilesystemPermission(that._currentFolder, "filesystem_item_access", "rw", true) : false
            };
        }

        that._handleCustomFolderTypeAction = function(ac, item, t) {
            if (!that._currentFolder || !that._currentFolder.type || !that._customFolderTypes[that._currentFolder.type] || !that._customFolderTypes[that._currentFolder.type].handleAction) return false;
            var ctx = that._getCtxObj(item, t)
            return that._customFolderTypes[that._currentFolder.type].handleAction(ac, item, t, ctx);
        }

        that.initList = function() {
            var $h = $("#kloudspeaker-folderview-header-items").empty();
            if (that.isListView()) {
                var cols = settings["file-view"]["list-view-columns"];
                if (that._currentFolderType && that._customFolderTypes[that._currentFolderType] && that._customFolderTypes[that._currentFolderType].getFileListCols) {
                    cols = that._customFolderTypes[that._currentFolderType].getFileListCols();
                }
                that.itemWidget = new FileList('kloudspeaker-folderview-items', $h, 'main', that._filelist, cols);
            } else {
                var thumbs = features.hasFeature('thumbnails');
                that.itemWidget = new IconView('kloudspeaker-folderview-items', $h, 'main', that._viewStyle == 1 ? 'iconview-small' : 'iconview-large', thumbs);
            }

            that.itemWidget.init({
                onFolderSelected: that.onFolderSelected,
                dragType: that.dragType,
                canDrop: that.canDragAndDrop,
                dropType: that.dropType,
                onDrop: that.onDragAndDrop,
                onClick: function(item, t, e, $col) {
                    if (that._handleCustomFolderTypeAction("onClick", item, t)) return;
                    if (that._handleCustomAction("onClick", item, t)) return;

                    var ctx = that._getCtxObj(item, t);
                    if (that.isListView() && t != 'icon') {
                        var col = that._filelist.columns[t];
                        if (col["on-click"]) {
                            col["on-click"].apply({
                                showBubble: function(spec) {
                                    controls.dynamicBubble({
                                        element: $col,
                                        title: spec.title,
                                        model: spec.model,
                                        view: spec.view,
                                        container: $("#kloudspeaker-filelist-main")
                                    });
                                }
                            }, [item, that._currentFolderData.data, ctx]);
                            return;
                        }
                    }
                    var showContext = false;
                    if (that.isListView()) {
                        if (!item.is_file) {
                            // folder click goes into the folder, icon opens context
                            if (t == 'name') that.changeToFolder(item);
                            else if (t == 'icon') showContext = true;
                        } else {
                            if (t == 'name' || t == 'icon') showContext = true;
                        }
                    } else {
                        if (t == 'info' || item.is_file) showContext = true;
                        else that.changeToFolder(item);
                    }

                    if (showContext) that.itemContext.open(ctx);
                },
                onDblClick: function(item) {
                    if (that._handleCustomFolderTypeAction("onDblClick", item)) return;
                    if (that._handleCustomAction("onDblClick", item)) return;
                    if (item.is_file) return;
                    that.changeToFolder(item);
                },
                onRightClick: function(item, t, e) {
                    if (that._handleCustomFolderTypeAction("onRightClick", item, t)) return;
                    if (that._handleCustomAction("onRightClick", item, t)) return;
                    that.showActionMenu(item, that.itemWidget.getItemContextElement(item));
                },
                onContentRendered: function(items, data) {
                    if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
                        if (that._customFolderTypes[that._currentFolder.type].onItemListRendered)
                            that._customFolderTypes[that._currentFolder.type].onItemListRendered(that._currentFolder, that._currentFolderData, items);
                    }
                },
                getSelectedItems: function() {
                    if (!that._selectMode || that._selectedItems.length === 0) return false;
                    return that._selectedItems;
                },
                onSelectUnselect: function(item) {
                    if (that._selectedItems.indexOf(item) >= 0) that._selectedItems.remove(item);
                    else that._selectedItems.push(item);
                    that.itemWidget.setSelection(that._selectedItems);
                }
            });
        };

        that._updateList = function() {
            that._items = that._currentFolderData.items;
            that._itemsById = utils.mapByKey(that._items, "id");
            if (that._selectedItems) {
                var existing = [];
                var ids = {};
                $.each(that._selectedItems, function(i, itm) {
                    var newItem = that._itemsById[itm.id];
                    if (!newItem || ids[itm.id]) return;
                    existing.push(newItem);
                    ids[itm.id] = true;
                });
                that._selectedItems = existing;
            }
            //$("#kloudspeaker-folderview-items").css("top", $("#kloudspeaker-folderview-header").outerHeight()+"px");
            that.itemWidget.content(that._items, that._currentFolderData.data);
            if (that._selectMode) that.itemWidget.setSelection(that._selectedItems);
        };

        that.showActionMenu = function(item, c) {
            c.addClass("open");
            var popup = controls.popupmenu({
                element: c,
                onHide: function() {
                    c.removeClass("open");
                    that.itemWidget.removeHover();
                }
            });

            that.getItemActions(item, function(a) {
                if (!a) {
                    popup.hide();
                    return;
                }
                popup.items(a);
            });
        };

        that.getItemActions = function(item, cb) {
            if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type] && that._customFolderTypes[that._currentFolder.type].getItemActions) {
                that._customFolderTypes[that._currentFolder.type].getItemActions(item).done(function(a) {
                    cb(a);
                });
                return;
            }

            fs.itemDetails(item, plugins.getItemContextRequestData(item)).done(function(d) {
                if (!d) {
                    cb([]);
                    return;
                }
                var ctx = {
                    fileview: that,
                    details: d,
                    folder: that._currentFolder,
                    folder_writable: that._currentFolder ? permissions.hasFilesystemPermission(that._currentFolder, "filesystem_item_access", "rw", true) : false
                };
                cb(utils.cleanupActions(utils.getPluginActions(plugins.getItemContextPlugins(item, ctx))));
            });
        };

        var UploadProgress = function($e) {
            var t = this;
            this._h = $e.height();
            t._$title = $e.find(".title");
            t._$speed = $e.find(".speed");
            t._$bar = $e.find(".bar");
            t._$cancelBtn = $e.find(".close");

            return {
                show: function(title, cb, cancelCb) {
                    $e.css("bottom", (0 - t._h) + "px");
                    t._$title.text(title ? title : "");
                    t._$speed.text("");
                    t._$bar.css("width", "0%");
                    t._$cancelBtn.unbind("click").bind("click", function() {
                        cancelCb();
                    });
                    $e.show().animate({
                        "bottom": "0"
                    }, 500, cb);
                },
                set: function(progress, speed) {
                    t._$bar.css("width", progress + "%");
                    t._$speed.text(speed ? speed : "");
                },
                hide: function(cb) {
                    setTimeout(function() {
                        $e.animate({
                            "bottom": (0 - t._h) + "px"
                        }, 500, function() {
                            t._$bar.css("width", "0%");
                            $e.hide();
                            if (cb) cb();
                        });
                    }, 1000);
                }
            }
        };

        //var IconView = ;

        //var FileList = 
        return that;
    };
});
