define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/ui/dnd', 'kloudspeaker/dom', 'kloudspeaker/localization', 'kloudspeaker/utils', 'jquery'], function(app, settings, dnd, dom, loc, utils, $) {
    return function(container, $headerContainer, id, filelistSpec, columns) {
        var t = this;
        t.minColWidth = 25;
        t.$c = $("#" + container);
        t.$hc = $headerContainer;
        t.listId = 'kloudspeaker-filelist-' + id;
        t.cols = [];
        t.sortCol = false;
        t.sortOrderAsc = true;
        t.colWidths = {};

        for (var colId in columns) {
            if (columns[colId] === false) continue;

            var col = filelistSpec.columns[colId];
            if (!col) {
                if (columns[colId].content) {
                    t.cols.push(columns[colId]);
                }
                continue;
            }

            var colSpec = $.extend({}, col, columns[colId]);
            t.cols.push(colSpec);
        }

        this.init = function(p) {
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
                title: function(c) {
                    var k = c['title-key'];
                    if (!k) return "";

                    return loc.get(k);
                }
            }).appendTo(t.$h);

            t.$h.find(".kloudspeaker-filelist-col-header").each(function(i) {
                var $t = $(this);
                var ind = $t.index();
                if (ind <= 1) return;
                var col = t.cols[ind - 2];

                var minColWidth = col["min-width"] || t.minColWidth;

                $t.css("min-width", minColWidth);
                if (col.width) $t.css("width", col.width);

                $t.find(".kloudspeaker-filelist-col-header-title").click(function() {
                    t.onSortClick(col);
                });

                if (i != (t.cols.length - 1)) {
                    $t.resizable({
                        handles: "e",
                        minWidth: minColWidth,
                        //autoHide: true,
                        start: function(e, ui) {
                            //TODO max?
                            var max = t.$c.width() - (t.cols.length * t.minColWidth);
                            $t.resizable("option", "maxWidth", max);
                        },
                        stop: function(e, ui) {
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
            t.data = {};
            t.onSortClick(t.cols[0]);
        };

        this.updateColWidths = function() {
            for (var colId in t.colWidths) t.updateColWidth(colId, t.colWidths[colId]);
        };

        this.updateColWidth = function(id, w) {
            $(".kloudspeaker-filelist-col-" + id).width(w);
        };

        this.onSortClick = function(col) {
            if (col.id != t.sortCol.id) {
                t.sortCol = col;
                t.sortOrderAsc = true;
            } else {
                t.sortOrderAsc = !t.sortOrderAsc;
            }
            t.refreshSortIndicator();
            utils.invokeLater(function() {
                t.content(t.items, t.data);    
            });
        };

        this.sortItems = function() {
            var s = t.sortCol.sort;
            t.items.sort(function(a, b) {
                return s(a, b, t.sortOrderAsc ? 1 : -1, t.data);
            });
        };

        this.refreshSortIndicator = function() {
            t.$h.find(".kloudspeaker-filelist-col-header").removeClass("sort-asc").removeClass("sort-desc");
            $("#kloudspeaker-filelist-col-header-" + t.sortCol.id).addClass("sort-" + (t.sortOrderAsc ? "asc" : "desc"));
        };

        this.getDataRequest = function() {
            var rq = {};
            for (var i = 0, j = t.cols.length; i < j; i++) {
                var c = t.cols[i];
                if (c['request-id']) rq[c['request-id']] = {};
                else if (c.dataRequest) {
                    if (typeof(c.dataRequest) === 'string') rq[c.dataRequest] = {};
                }
            }
            return rq;
        };

        this.content = function(items, data) {
            t.items = items;
            t.data = data;
            t.sortItems();

            dom.template("kloudspeaker-tmpl-filelist-item", items, {
                cols: t.cols,
                typeClass: function(item) {
                    var c = item.is_file ? 'item-file' : 'item-folder';
                    if (item.is_file && item.extension) c += ' item-type-' + item.extension.toLowerCase();
                    else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
                    return c;
                },
                col: function(item, col) {
                    return col.content(item, t.data);
                },
                itemColStyle: function(item, col) {
                    var style = "min-width:" + (col["min-width"] || t.minColWidth) + "px";
                    if (col.width) style = style + ";width:" + col.width + "px";
                    return style;
                },
                itemColTitle: function(item, col) {
                    var title = "";
                    if (col["value-title"]) title = col["value-title"](item, t.data);
                    return title;
                }
            }).appendTo(t.$i.empty());

            for (var i = 0, j = t.cols.length; i < j; i++) {
                var col = t.cols[i];
                if (col["on-render"]) col["on-render"](t);
            }

            var $items = t.$i.find(".kloudspeaker-filelist-item");
            $items.hover(function() {
                $(this).addClass("hover");
            }, function() {
                $(this).removeClass("hover");
            }).bind("contextmenu", function(e) {
                e.preventDefault();
                t.onItemClick($(this), $(e.toElement || e.target), false);
                return false;
            }).single_double_click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                t.onItemClick($(this), $(e.toElement || e.target), true);
                return false;
            }, function() {
                t.p.onDblClick($(this).tmplItem().data);
            });

            if (dnd) {
                var dragType = t.p.dragType();
                if (dragType) {
                    dnd.enableDrag($items, {
                        onDragStart: function($e, e) {
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
                    canDrop: function($e, e, obj) {
                        if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        return t.p.canDrop(me, i);
                    },
                    dropType: function($e, e, obj) {
                        if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        return t.p.dropType(me, i);
                    },
                    onDrop: function($e, e, obj) {
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

            t.p.onContentRendered(items, data);
        };

        this.updateItems = function(i, data) {
            t.data = data;

            $.each(i, function(ind, item) {
                var $i = t.$i.find("#kloudspeaker-filelist-item-" + item.id);
                if ($i.length === 0) return;

                for (var ci = 0, j = t.cols.length; ci < j; ci++) {
                    var col = t.cols[ci];
                    $i.find(".kloudspeaker-filelist-col-" + col.id).html(col.content(item, t.data));
                }
            });
        };

        this.onItemClick = function($item, $el, left) {
            var $col = $el.closest(".kloudspeaker-filelist-col");
            var i = $item.find(".kloudspeaker-filelist-col").index($col);
            if (i < 0) return;
            var itm = $item.tmplItem().data;
            if (i === 0) {
                t.p.onSelectUnselect(itm);
                return;
            }
            var colId = (i === 1 ? "icon" : t.cols[i - 2].id);
            if (left)
                t.p.onClick(itm, colId, $item, $col);
            else
                t.p.onRightClick(itm, colId, $item, $col);
        };

        this.getItemContextElement = function(item) {
            var $i = t.$i.find("#kloudspeaker-filelist-item-" + item.id);
            return $i.find(".kloudspeaker-filelist-col-name") || $i;
        };

        this.getItemForElement = function($el) {
            return $el.tmplItem().data;
        };

        this.getContainerElement = function() {
            return t.$i;
        };

        this.removeHover = function() {
            t.$i.find(".kloudspeaker-filelist-item.hover").removeClass('hover');
        };

        this.setSelectMode = function(sm) {
            t.$i.find(".kloudspeaker-filelist-item.selected").removeClass("selected");
            if (sm) {
                t.$l.addClass("select");
                t.$h.addClass("select");
            } else {
                t.$l.removeClass("select");
                t.$h.removeClass("select");
            }
        };

        this.setSelection = function(items) {
            t.$i.find(".kloudspeaker-filelist-item.selected").removeClass("selected");
            $.each(items, function(i, itm) {
                t.$i.find("#kloudspeaker-filelist-item-" + itm.id).addClass("selected");
            });
        };
    };
});
