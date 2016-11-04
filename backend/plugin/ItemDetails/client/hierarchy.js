define(['kloudspeaker/filesystem', 'kloudspeaker/utils', 'kloudspeaker/dom', 'kloudspeaker/plugins'], function(fs, utils, dom, plugins) {
    dom.importCss(plugins.url('ItemDetails', 'style.css'));

    return function() {
        var that = this;
        var model = {
            item: null,
            folderInfo: null
        };

        var $tree = false;
        var loaded = {};
        var parentLevel = 0;

        var load = function($e, parent) {
            if (loaded[parent ? parent.id : "root"]) return;

            $tree.addClass("loading");
            fs.items(parent, false, false).done(function(r) {
                $tree.removeClass("loading");
                loaded[parent ? parent.id : "root"] = true;

                if (!r.folders || r.folders.length === 0) {
                    if ($e) $e.find(".kloudspeaker-itemselector-folder-indicator").empty();
                    return;
                }

                var level = 0;
                var levels = [];
                if (parent) {
                    var matches = parent.path.match(/\//g);
                    if (matches) level = matches.length + 1 - parentLevel;
                    level = Math.max(0, level);

                    //generate array for template to iterate
                    for (var i = 0; i < level; i++) levels.push({});
                }
                var c = $("#kloudspeaker-tmpl-itemdetails-tree-item").tmpl(r.folders, {
                    cls: '',
                    levels: levels,
                    info: model.data.by_id,
                    parent_id: parent.id,
                    folder_info: model.folderInfo
                });
                if ($e) {
                    
                    $e.addClass("loaded");
                    if ($e) $e.children(".kloudspeaker-itemselector-folder-indicator").children("i").removeClass("fa fa-caret-right").addClass("fa fa-caret-down");
                    $e.append(c);
                } else {
                    $tree.append(c);
                }
                if (!parent && r.folders.length == 1) {
                    load($(c[0]), r.folders[0]);
                }
            });
        };

        return {
            model: model,
            activate: function(params) {
                model.item = params.item;
                model.data = params.data;
                model.folders = params.data.folder_count > 0;
                model.folderInfo = params.conf ? params.conf["folder-info"] : null;

                var matches = model.item.path.match(/\//g);
                if (matches) parentLevel = matches.length + 1;
            },
            onShow: function(container) {
                $tree = container.find(".folder-tree");
                $tree.on("click", ".kloudspeaker-itemselector-item.folder", function(e) {
                    var $e = $(this);
                    var p = $e.tmplItem().data;
                    if (loaded[p.id]) {
                        var $arrow = $e.children(".kloudspeaker-itemselector-folder-indicator").children("i");
                        var open = $arrow.hasClass("fa-caret-down");
                        var $children = $tree.find(".kloudspeaker-itemselector-item[data-item-parent-id="+p.id+"]");
                        if (open) {
                            $arrow.removeClass("fa-caret-down").addClass("fa-caret-right");
                            $children.hide();
                        } else {
                            $arrow.removeClass("fa-caret-right").addClass("fa-caret-down");
                            $children.show();
                        }
                    } else {
                        load($e, p);
                    }
                    return false;
                });
                load(null, model.item);
            }
        };
    };
});
