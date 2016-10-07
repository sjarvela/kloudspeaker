define(['kloudspeaker/filesystem', 'kloudspeaker/utils'], function(fs, utils) {
    return function() {
        var that = this;
        var model = {
            item: null,
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

                var all = r.files ? (r.folders.concat(r.files)) : r.folders;

                if (!all || all.length === 0) {
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
                var c = $("#kloudspeaker-tmpl-dialog-itemselector-item").tmpl(all, {
                    cls: '',
                    levels: levels
                });
                if ($e) {
                    $e.after(c);
                    $e.addClass("loaded");
                    if ($e) $e.find(".kloudspeaker-itemselector-folder-indicator").find("i").removeClass("fa fa-caret-right").addClass("fa fa-caret-down");
                } else {
                    $tree.append(c);
                }
                if (!parent && all.length == 1) {
                    load($(c[0]), all[0]);
                }
            });
        };

        return {
            model: model,
            activate: function(params) {
                model.item = params.item;
                model.folders = params.data.folder_count > 0;

                console.log('activate', params);
                var matches = model.item.path.match(/\//g);
                if (matches) parentLevel = matches.length + 1;
            },
            onShow: function(container) {
                console.log('hierarchy');

                $tree = container.find(".folder-tree");
                $tree.on("click", ".kloudspeaker-itemselector-folder-indicator", function(e) {
                    var $e = $(this).parent();
                    var p = $e.tmplItem().data;
                    load($e, p);
                    return false;
                });
                /*$selector.on("click", ".kloudspeaker-itemselector-item", function(e) {
                    var $e = $(this);
                    var p = $(this).tmplItem().data;
                    if (p.is_file && !spec.allowFiles) return;
                    if (!p.is_file && !spec.allowFolders) return;

                    if (spec.handler.canSelect(p)) {
                        selectedItem = p;
                        $(".kloudspeaker-itemselector-item").removeClass("selected");
                        $e.addClass("selected");
                    }
                });*/
                load(null, model.item);
            }
        };
    };
});
