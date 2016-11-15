define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/ui/dnd', 'kloudspeaker/dom', 'kloudspeaker/localization', 'kloudspeaker/utils', 'jquery'], function (app, settings, dnd, dom, loc, utils, $) {
    return function (container, $headerContainer, id, filelistSpec, columns) {
        var t = this;
        t.minColWidth = 25;
        t.$c = $("#" + container);
        t.$hc = $headerContainer;
        t.listId = 'kloudspeaker-filelist-' + id;
        t.cols = [];
        t.colsById = {};
        t.sortCol = false;
        t.sortOrderAsc = true;
        t.colWidths = {};

        _.each(columns, function (c) {
            var colId = c.id;

            var col = filelistSpec.columns[colId];
            if (!col) {
                if (!c.content) return;
            } else {
                col = $.extend({}, col, c);
            }

            t.cols.push(col);
            t.colsById[colId] = col;
        });

        this.init = function (p) {
            t.hierarchy = !!settings["file-view"]["list-view-hierarchy"];
            t.foldersExpanded = {};
            t.p = p;
            dom.template("kloudspeaker-tmpl-filelist-header", {
                listId: t.listId
            }).appendTo(t.$hc.empty());
            dom.template("kloudspeaker-tmpl-filelist", {
                listId: t.listId
            }).appendTo(t.$c.empty());
            t.$l = $("#" + t.listId);
            t.$h = $("#" + t.listId + "-header-cols");
            t.$i = $("#" + t.listId + "-items");

            dom.template("kloudspeaker-tmpl-filelist-headercol", t.cols, {
                title: function (c) {
                    var k = c['title-key'];
                    if (!k) return c.title || "";

                    return loc.get(k);
                }
            }).appendTo(t.$h);

            t.$h.find(".kloudspeaker-filelist-col-header").each(function (i) {
                var $t = $(this);
                var ind = $t.index();
                if (ind <= 1) return;
                var col = t.cols[ind - 2];

                var minColWidth = col["min-width"] || t.minColWidth;

                $t.css("min-width", minColWidth);
                if (col.width) $t.css("width", col.width);

                $t.find(".kloudspeaker-filelist-col-header-title").click(function () {
                    t.onSortClick(col);
                });

                if (i != (t.cols.length - 1)) {
                    $t.resizable({
                        handles: "e",
                        minWidth: minColWidth,
                        //autoHide: true,
                        start: function (e, ui) {
                            //TODO max?
                            var max = t.$c.width() - (t.cols.length * t.minColWidth);
                            $t.resizable("option", "maxWidth", max);
                        },
                        stop: function (e, ui) {
                            var w = $t.width();
                            t.colWidths[col.id] = w;
                            t.updateColWidth(col.id, w);
                        }
                    });
                    /*.draggable({
                                            axis: "x",
                                            helper: "clone",
                                            revert: "invalid",
                                            distance: 30
                                        });*/
                }
                if (col["on-init"]) col["on-init"](t);
            });
            t.items = [];
            //t.data = {};

            var sortDefined = false;
            if (settings["file-view"]["default-sort"]) {
                var ds = settings["file-view"]["default-sort"];
                var sortColId, sortColAsc = true;

                if (_.isObject(ds)) {
                    sortColId = settings["file-view"]["default-sort"].col;
                    sortColAsc = !!settings["file-view"]["default-sort"].asc;
                } else {
                    if (_.isString(ds)) sortColId = ds;
                }

                if (sortColId && t.colsById[sortColId]) {
                    sortDefined = true;
                    t.setSort(t.colsById[sortColId], sortColAsc, true);
                }
            }
            if (!sortDefined) {
                var col = _.find(t.cols, function (c) {
                    return !!c.sort;
                });
                t.setSort(col, true, true);
            }
        };

        this.updateColWidths = function () {
            for (var colId in t.colWidths) t.updateColWidth(colId, t.colWidths[colId]);
        };

        this.updateColWidth = function (id, w) {
            $(".kloudspeaker-filelist-col-" + id).width(w);
        };

        this.onSortClick = function (col) {
            var sortAsc = true;
            if (col.id == t.sortCol.id)
                sortAsc = !t.sortOrderAsc;
            t.setSort(col, sortAsc);
        };

        this.setSort = function (col, asc, nocontent) {
            t.sortCol = col;
            t.sortOrderAsc = asc;

            t.refreshSortIndicator();
            if (!nocontent)
                utils.invokeLater(function () {
                    t.content(t.items, t.data);
                });
        }

        this.sortItems = function () {

            var _compare = function (ai, bi) {
                var level_a = ai.level;
                var level_b = bi.level;

                /*console.log("COMPARE");
                console.log(ai);
                console.log(level_a);
                console.log(bi);
                console.log(level_b);*/

                if (level_a != level_b) {
                    var r;
                    if (ai.id == bi.parent_id) r = -1;
                    else if (bi.id == ai.parent_id) r = 1;
                    else r = level_a > level_b ? _compare(t.itemsById[ai.parent_id], bi) : _compare(ai, t.itemsById[bi.parent_id]);

                    //console.log("diff level => " + r);
                    return r;
                }
                if (ai.parent_id != bi.parent_id) {
                    r = _compare(t.itemsById[ai.parent_id], t.itemsById[bi.parent_id]);
                    //console.log("diff parent => " + r);
                    return r;
                }

                var r = t.sortCol.sort(ai, bi, t.sortOrderAsc ? 1 : -1, t.p.getItemData(ai), t.p.getItemData(bi));
                //console.log("same folder => " + r);
                return r;
            };

            //var s = t.sortCol.sort;
            t.items.sort(_compare);
            /*function (a, b) {


                           console.log(a);
                           console.log(level_a);
                           console.log(b);
                           console.log(level_b);
                           
                       });*/
        };

        this.refreshSortIndicator = function () {
            t.$h.find(".kloudspeaker-filelist-col-header").removeClass("sort-asc").removeClass("sort-desc");
            $("#kloudspeaker-filelist-col-header-" + t.sortCol.id).addClass("sort-" + (t.sortOrderAsc ? "asc" : "desc"));
        };

        this.getDataRequest = function () {
            var rq = {};
            for (var i = 0, j = t.cols.length; i < j; i++) {
                var c = t.cols[i];
                if (c['request-id']) rq[c['request-id']] = {};
                else if (c.dataRequest) {
                    if (typeof (c.dataRequest) === 'string') rq[c.dataRequest] = {};
                }
            }
            return rq;
        };

        this._content = function () {
            dom.template("kloudspeaker-tmpl-filelist-item", t.items, {
                parent: t.folder,
                cols: t.cols,
                itemLevel: function (item) {
                    return new Array(item.level - t.folder.level);
                },
                typeClass: function (item) {
                    var c = item.is_file ? 'item-file' : 'item-folder';
                    if (item.is_file && item.extension) c += ' item-type-' + item.extension.toLowerCase();
                    else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
                    return c;
                },
                col: function (item, col) {
                    return col.content(item, t.p.getItemData(item));
                },
                itemColStyle: function (item, col) {
                    var style = "min-width:" + (col["min-width"] || t.minColWidth) + "px";
                    if (col.width) style = style + ";width:" + col.width + "px";
                    return style;
                },
                itemColTitle: function (item, col) {
                    var title = "";
                    if (col["value-title"]) title = col["value-title"](item, t.p.getItemData(item));
                    return title;
                },
                hierarchy: t.hierarchy,
                foldersExpanded: t.foldersExpanded
            }).appendTo(t.$i.empty());

            for (var i = 0, j = t.cols.length; i < j; i++) {
                var col = t.cols[i];
                if (col["on-render"]) col["on-render"](t);
            }

            var $items = t.$i.find(".kloudspeaker-filelist-item");
            $items.hover(function () {
                $(this).addClass("hover");
            }, function () {
                $(this).removeClass("hover");
            }).bind("contextmenu", function (e) {
                e.preventDefault();
                t.onItemClick($(this), $(e.toElement || e.target), false);
                return false;
            }).single_double_click(function (e) {
                e.preventDefault();
                e.stopPropagation();
                t.onItemClick($(this), $(e.toElement || e.target), true);
                return false;
            }, function () {
                t.p.onDblClick($(this).tmplItem().data);
            });

            if (dnd) {
                var dragType = t.p.dragType();
                if (dragType) {
                    dnd.enableDrag($items, {
                        onDragStart: function ($e, e) {
                            var item = $e.tmplItem().data;
                            var sel = t.p.getSelectedItems();
                            if (!sel) sel = item;
                            else if (sel.indexOf(item) < 0) sel.push(item);
                            return {
                                type: dragType,
                                payload: sel
                            };
                        }
                    });
                }
                dnd.enableDrop(t.$i.find(".kloudspeaker-filelist-item.item-folder"), {
                    canDrop: function ($e, e, obj) {
                        if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        return t.p.canDrop(me, i);
                    },
                    dropType: function ($e, e, obj) {
                        if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        return t.p.dropType(me, i);
                    },
                    onDrop: function ($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        if (t.p.onDrop) t.p.onDrop(me, i);
                    }
                });
            }

            /*.click(function(e) {
                e.preventDefault();
                t.onItemClick($(this), $(e.srcElement), true);
                return false;
            })*/

            /*t.$i.find(".kloudspeaker-filelist-quickmenu").click(function(e) {
                e.preventDefault();
                var $t = $(this);
                t.p.onMenuOpen($t.tmplItem().data, $t);
            });*/

            /*t.$i.find(".kloudspeaker-filelist-item-name-title").click(function(e) {
                e.preventDefault();
                t.p.onClick($(this).tmplItem().data, "name");
            });*/
            /*t.$i.find(".item-folder .kloudspeaker-filelist-item-name-title").click(function(e) {
                e.preventDefault();
                t.p.onFolderSelected($(this).tmplItem().data);
            });*/

            t.updateColWidths();

            t.p.onContentRendered(t.items);
        }

        this.content = function (items, d) {
            var that = this;

            t.items = [];
            t.itemsById = {};
            t.data = d;

            var _getLevel = function (i) {
                var l = (i.path.match(/\//g) || []).length;
                return Math.max(0, i.is_file ? l : l - 1);
            }

            d.folder.level = _getLevel(d.folder);

            t.folder = d.folder;

            //prefetch subfolders
            var dfl = [];
            _.each(utils.getKeys(t.foldersExpanded), function (fid) {
                dfl.push(t.p.getFolderInfo(fid));
            });

            utils.all(dfl).done(function () {
                var _processList = function (l) {
                    _.each(l, function (i) {
                        i.level = _getLevel(i);
                        t.itemsById[i.id] = i;
                        t.items.push(i);

                        if (i.is_file || !t.foldersExpanded[i.id]) return;
                        dfl.push(t.p.getFolderInfo(i).done(function (sfi) {
                            _processList(sfi.items);
                        }));
                    });
                }

                _processList(items);

                t.sortItems();
                that._content();
            });

        };

        this.updateItems = function (i) {
            //t.data = data;

            $.each(i, function (ind, item) {
                var $i = t.$i.find("#kloudspeaker-filelist-item-" + item.id);
                if ($i.length === 0) return;

                for (var ci = 0, j = t.cols.length; ci < j; ci++) {
                    var col = t.cols[ci];
                    $i.find(".kloudspeaker-filelist-col-" + col.id).html(col.content(item, t.p.getItemData(item)));
                }
            });
        };

        this.onItemClick = function ($item, $el, left) {
            var $col = $el.closest(".kloudspeaker-filelist-col");

            var i = $item.find(".kloudspeaker-filelist-col").index($col);
            if (i < 0) return;
            var itm = $item.tmplItem().data;

            // select
            if (i === 0) {
                t.p.onSelectUnselect(itm);
                return;
            }
            // hierarchy
            if (i === 1) {
                if (t.foldersExpanded[itm.id]) {
                    t.foldersExpanded[itm.id] = false;
                    t.p.onExpandFolder(itm, false);
                } else {
                    t.foldersExpanded[itm.id] = true;
                    t.p.onExpandFolder(itm, true);
                }
                return;
            }
            var colId = (i === 2 ? "icon" : t.cols[i - 3].id);
            if (left)
                t.p.onClick(itm, colId, $item, $col);
            else
                t.p.onRightClick(itm, colId, $item, $col);
        };

        this.getItemElement = function (item) {
            return t.$i.find("#kloudspeaker-filelist-item-" + item.id);
        };

        this.getPanelContainer = function (item) {
            var $i = t.$i.find("#kloudspeaker-filelist-item-" + item.id);
            var $c = false;
            return {
                get: function () {
                    if (!$c) $c = $("<div class='kloudspeaker-filelist-item-panel-placeholder'></div>").insertAfter($i);
                    return $c;
                },
                close: function () {
                    if ($c) $c.remove();
                }
            }
        };

        this.getItemContextElement = function (item) {
            var $i = t.$i.find("#kloudspeaker-filelist-item-" + item.id);
            return $i.find(".kloudspeaker-filelist-col-name") || $i;
        };

        this.getItemForElement = function ($el) {
            return $el.tmplItem().data;
        };

        this.getContainerElement = function () {
            return t.$i;
        };

        this.removeHover = function () {
            t.$i.find(".kloudspeaker-filelist-item.hover").removeClass('hover');
        };

        this.setSelectMode = function (sm) {
            t.$i.find(".kloudspeaker-filelist-item.selected").removeClass("selected");
            if (sm) {
                t.$l.addClass("select");
                t.$h.addClass("select");
            } else {
                t.$l.removeClass("select");
                t.$h.removeClass("select");
            }
        };

        this.setSelection = function (items) {
            t.$i.find(".kloudspeaker-filelist-item.selected").removeClass("selected");
            $.each(items, function (i, itm) {
                t.$i.find("#kloudspeaker-filelist-item-" + itm.id).addClass("selected");
            });
        };
    };
});
