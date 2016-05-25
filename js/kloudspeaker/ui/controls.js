define(['kloudspeaker/localization', 'kloudspeaker/dom', 'kloudspeaker/service', 'kloudspeaker/ui', 'kloudspeaker/utils', 'kloudspeaker/settings'], function(loc, dom, service, ui, utils, settings) {
    var rootOffset = { top: 0, left: 0 };

    var processPopupActions = function(l) {
        $.each(l, function(i, item) {
            if (item.type == 'submenu') {
                processPopupActions(item.items);
                return;
            }
            if (item.title) return;
            if (item["title-key"]) item.title = loc.get(item['title-key']);
        });
    };
    var createPopupItems = function(itemList) {
        var list = itemList || [];
        processPopupActions(list);
        return dom.template("kloudspeaker-tmpl-popupmenu", {
            items: list
        });
    };
    var initPopupItems = function($p, l, onItem) {
        $p.find(".dropdown-item, .dropdown-submenu").click(function() {
            var $e = $(this);
            var $top = $p.find(".dropdown-menu");
            var path = [];
            while (true) {
                if (!$e.hasClass("dropdown-menu"))
                    path.push($e.index());
                $e = $e.parent();
                if ($e[0] == $top[0]) break;
            }
            var item = false;
            var parent = l;
            $.each(path.reverse(), function(i, ind) {
                item = parent[ind];
                if (item.type == 'submenu') parent = item.items;
            });
            if (item.type == 'submenu' && item.primary)
                item = item.primary;
            if (onItem) onItem(item, item.callback ? item.callback() : null);
            else if (item.callback) item.callback();
            return false;
        });
    };
    var app = null; //TODO remove
    var controls = {

        //TODO remove
        setup: function(a) {
            app = require('kloudspeaker/instance');
            if (settings.offset)
                rootOffset = settings.offset;
        },

        dropdown: function(a) {
            var $e = $(a.element);
            var $mnu = false;
            var popupId = false;
            var popupItems = a.items;
            //$e.addClass('dropdown');
            var hidePopup = function() {
                if (!$mnu) return;
                if (a.onHide) a.onHide();
                $mnu.parent().removeClass("open");
                ui.removeActivePopup(popupId);
            };
            var onItem = function(i, cbr) {
                hidePopup();
                if (a.onItem) a.onItem(i, cbr);
            };

            var api = {
                hide: hidePopup,
                items: function(items) {
                    if (!$mnu) {
                        popupItems = items;
                        return;
                    }
                    $mnu.remove();
                    $mnu = createPopupItems(items);
                    $e.removeClass("loading").append($mnu);
                    initPopupItems($e, items, onItem);
                    popupItems = items;
                }
            };
            if (a.parentPopupId) api.parentPopupId = a.parentPopupId;

            var $toggle = $e.find(".dropdown-toggle");
            if ($toggle.length != 1) return;

            $toggle.parent().append(createPopupItems(a.items));

            $toggle.dropdown({
                onshow: function($p) {
                    var itemsInitialized = !!$mnu;
                    if (!$mnu)
                        $mnu = $($p.find(".dropdown-menu")[0]);
                    if (!a.parentPopupId)
                        popupId = ui.activePopup(api);
                    if (!popupItems) $mnu.addClass("loading");
                    else if (!itemsInitialized && popupItems) api.items(popupItems);
                    
                    if (a.onShow) a.onShow(api, popupItems);
                },
                onhide: function() {
                    hidePopup();
                    if (a.dynamic) popupItems = false;
                }
            });
            initPopupItems($e, a.items, onItem);
            return api;
        },

        popupmenu: function(a) {
            var popupId = false;
            var $e = $(a.element);
            var pos = $e.offset();
            var $mnu = $('<div class="kloudspeaker-popupmenu" style="position: absolute; top: ' + (pos.top - rootOffset.top + $e.outerHeight()) + 'px; left:' + (pos.left - rootOffset.left) + 'px;"></div>');
            var popupitems = a.items;
            var hidePopup = function() {
                if (a.onHide) a.onHide();
                $mnu.remove();
                ui.removeActivePopup(popupId);
            };
            var onItem = function(i, cbr) {
                hidePopup();
                if (a.onItem) a.onItem(i, cbr);
            };

            if (!a.items) $mnu.addClass("loading");
            $mnu.append(createPopupItems(a.items).css("display", "block"));
            if (a.style) $mnu.addClass(a.style);
            app.getElement().append($mnu); //.on('click', hidePopup);

            var api = {
                hide: hidePopup,
                items: function(items) {
                    $mnu.empty().removeClass("loading").append(createPopupItems(items).css("display", "block"));
                    initPopupItems($mnu, items, onItem);
                }
            };
            if (a.items) initPopupItems($mnu, a.items, onItem);
            popupId = ui.activePopup(api);
            return api;
        },

        bubble: function(o) {
            var $e = o.element;
            var actionId = $e.attr('id');
            if (!actionId) return;

            var content = $("#" + actionId + '-bubble');
            if (!content || content.length === 0) return;

            var html = content.html();
            content.remove();

            var $tip = false;
            var rendered = false;
            var api = {
                hide: function() {
                    $e.popover('hide');
                },
                close: this.hide
            };
            var $el = $('<div class="popover kloudspeaker-bubble-popover ' + (o.cls || '') + '"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"><p></p></div></div></div>');
            $e.popover({
                title: false,
                html: true,
                placement: 'bottom',
                trigger: 'manual',
                template: $el,
                content: html
            }).bind("shown", function(e) {
                $tip = $el;
                ui.activePopup(api);
                /*$tip.click(function(e) {
                    e.preventDefault();
                    return false;
                });*/
                if (!rendered) {
                    if (o.handler && o.handler.onRenderBubble) o.handler.onRenderBubble(actionId, api);
                    rendered = true;
                }
                if (o.handler && o.handler.onShowBubble) o.handler.onShowBubble(actionId, api);
            }).bind("hidden", function() {
                //$e.unbind("shown").unbind("hidden");
                ui.removeActivePopup(api.id);
            });
            $e.click(function(e) {
                e.preventDefault();
                $e.popover('show');
                return false;
            });
        },

        dynamicBubble: function(o) {
            var $e = o.element;

            var bubbleHtml = function(c) {
                if (!c) return "";
                if (typeof(c) === 'string') return c;
                return $("<div/>").append(c).html();
            };
            var _model = false;
            var html = o.content ? bubbleHtml(o.content) : '<div class="loading"></div>';
            var $tip = false;
            var $cnt = o.container || $e.parent();
            var $vp = o.viewport || $cnt;
            var pos = function() {
                var $pop = $el.closest(".popover");
                var maxRight = $vp.outerWidth();
                var popLeft = $pop.offset().left - $cnt.offset().left;
                var popW = $pop.outerWidth();
                if (popLeft < 0)
                    popLeft = 0;
                else if ((popLeft + popW) > maxRight)
                    popLeft = maxRight - popW - 10;
                $pop.css("left", popLeft + "px");

                var arrowPos = ($e.offset().left - $cnt.offset().left) + ($e.outerWidth() / 2) - 10;
                arrowPos = Math.max(0, (arrowPos - popLeft));
                $pop.find(".arrow").css("left", arrowPos + "px");
            };
            var api = {
                show: function() {
                    $e.popover('show');
                },
                hide: function(dontDestroy) {
                    if (dontDestroy) $tip.hide();
                    else {
                        if (_model)
                            ko.utils.domNodeDisposal.removeNode($tip[0]);
                        $e.popover('destroy');
                    }
                },
                element: function() {
                    return $tip;
                },
                getContent: function() {
                    return $tip.find('.popover-content');
                },
                content: function(c) {
                    var $c = $tip.find('.popover-content');
                    if (typeof(c) === 'string') $c.html(c);
                    else $c.empty().append(c);
                    pos();
                },
                position: pos
            };
            api.close = api.hide;
            var $el = $('<div class="popover kloudspeaker-bubble-popover ' + (o.cls || '') + '"><div class="arrow"></div>' + (o.title ? '<h3 class="popover-title"></h3>' : '') + '<div class="popover-content"></div></div>');

            $e.popover({
                title: o.title ? o.title : false,
                html: true,
                placement: 'bottom',
                trigger: 'manual',
                template: $el,
                content: html,
                container: $cnt
            }).bind("shown", function(e) {
                $tip = $el;

                ui.activePopup(api);
                $tip.click(function(e) {
                    e.stopPropagation();
                });
                if (o.title)
                    $tip.find(".popover-title").append($('<button type="button" class="close">×</button>').click(function() {
                        api.close();
                    }));
                if (!o.model)
                    ui.handlers.localize($tip);
                if (o.handler && o.handler.onRenderBubble) o.handler.onRenderBubble(api);

                if (o.model)
                    ui.viewmodel(o.view, o.model, $tip.find('.popover-content')).done(function(m) {
                        pos();
                        _model = m;
                        if (m.onShow) m.onShow(api);
                    });
            }).bind("hidden", function() {
                $e.unbind("shown").unbind("hidden");
                ui.removeActivePopup(api.id);
            });
            $e.popover('show');

            return api;
        },

        table: function(id, o) {
            var $e = (typeof(id) == 'string') ? $("#" + id) : $(id);
            if ($e.length === 0 || !o.columns) return false;

            if ($e.hasClass("kloudspeaker-table")) {
                //already initialized, create new element
                var $n = $("<table></table>").insertAfter($e).attr("id", $e.attr("id"));
                $e.remove();
                $e = $n;
            }

            var selectionChangedCb = $.Callbacks();
            $e.addClass("kloudspeaker-table");
            if (o.id) $e.addClass("kloudspeaker-table-" + o.id);
            if (o.onSelectionChanged) selectionChangedCb.add(o.onSelectionChanged);
            $e.addClass("table");
            if (o.narrow) $e.addClass("table-condensed");
            if (o.hilight) $e.addClass("hilight");
            var dataInfo = false;
            var $pagingControls = false;
            var perPageMax = (o.remote && o.remote.paging ? o.remote.paging.max || 50 : 50);

            var refreshPagingControls = function() {
                var $p = $pagingControls.find("ul").empty();
                var pages = dataInfo ? Math.ceil(dataInfo.total / perPageMax) : 0;
                if (pages < 2) return;

                var current = dataInfo ? (Math.floor(dataInfo.start / perPageMax) + 1) : 0;
                var mid = current + Math.floor((pages - current) / 2);
                var getNrBtn = function(nr) {
                    return $('<li class="page-btn page-nr' + ((current == nr) ? ' active' : '') + '"><a href="javascript:void(0);">' + nr + '</a></li>');
                };

                $p.append($('<li class="page-btn page-prev' + ((current <= 1) ? ' disabled' : '') + '"><a href="javascript:void(0);">&laquo;</a></li>'));
                if (pages <= 10) {
                    for (var i = 1; i <= pages; i++) {
                        $p.append(getNrBtn(i));
                    }
                } else {
                    if (current != 1) $p.append(getNrBtn(1));
                    if (current > 2) $p.append(getNrBtn(2));
                    if (current > 3) $p.append("<li class='page-break'>...</li>");

                    if (current > 4) $p.append(getNrBtn(current - 2));
                    if (current > 3) $p.append(getNrBtn(current - 1));
                    $p.append(getNrBtn(current));
                    if (current < (pages - 2)) $p.append(getNrBtn(current + 1));
                    if (current < (pages - 1)) $p.append(getNrBtn(current + 2));

                    /*if (current > 4 && current < (pages-3)) {
                        $p.append("<li class='page-break'>...</li>");
                        $p.append(getNrBtn(mid-1));
                        $p.append(getNrBtn(mid));
                        $p.append(getNrBtn(mid+1));
                    }*/

                    if (current < (pages - 2)) $p.append("<li class='page-break'>...</li>");
                    if (current < (pages - 1)) $p.append(getNrBtn(pages - 1));
                    if (current != pages) $p.append(getNrBtn(pages));
                }
                $p.append($('<li class="page-btn page-next' + ((current >= pages) ? ' disabled' : '') + '"><a href="javascript:void(0);">&raquo;</a></li>'));
            };
            if (o.remote && o.remote.paging) {
                var $ctrl = o.remote.paging.controls || $("<div class='kloudspeaker-table-pager'></div>").insertAfter($e);
                $pagingControls = $('<div class="pagination"><ul></ul></div>').appendTo($ctrl);
                $ctrl.delegate(".page-btn > a", "click", function(e) {
                    if (!dataInfo) return;

                    var $t = $(this);
                    var $p = $t.parent();
                    if ($p.hasClass("disabled")) return;

                    var page = Math.floor(dataInfo.start / perPageMax) + 1;
                    var pages = Math.ceil(dataInfo.total / perPageMax);
                    if ($p.hasClass("page-next")) page++;
                    else if ($p.hasClass("page-prev")) page--;
                    else {
                        page = parseInt($t.text(), 10);
                    }
                    if (page < 1 || page > pages) return;
                    dataInfo.start = (page - 1) * perPageMax;
                    api.refresh();
                });
                refreshPagingControls();
            }

            var findRow = function(item) {
                var found = false;
                $l.find("tr").each(function() {
                    var $row = $(this);
                    var rowItem = $row[0].data;
                    if (item == rowItem) {
                        found = $row;
                        return false;
                    }
                });
                return found;
            };
            var getSelectedRows = function() {
                var sel = [];
                $e.find(".kloudspeaker-tableselect:checked").each(function(i, e) {
                    var item = $(e).parent().parent()[0].data;
                    sel.push(item);
                });
                return sel;
            };
            var setRowSelected = function(item, sel) {
                var $row = findRow(item);
                $row.find(".kloudspeaker-tableselect").prop("checked", sel);
                selectionChangedCb.fire();
            };
            var updateSelectHeader = function() {
                var count = $l.children().length;
                var all = (count > 0 && getSelectedRows().length == count);
                if (all)
                    $e.find(".kloudspeaker-tableselect-header").prop("checked", true);
                else
                    $e.find(".kloudspeaker-tableselect-header").prop("checked", false);
            };
            selectionChangedCb.add(updateSelectHeader);
            var selectAll = function(s) {
                $e.find(".kloudspeaker-tableselect").prop("checked", s);
            };
            var $h = $("<tr></tr>").appendTo($("<thead></thead>").appendTo($e));
            var firstSortable = false;
            var thClick = function(e) {
                var count = $l.children().length;
                var all = (count > 0 && getSelectedRows().length == count);
                selectAll(!all);
                selectionChangedCb.fire();
            };
            for (var i = 0, j = o.columns.length; i < j; i++) {
                var $th;
                var col = o.columns[i];
                if (col.type == 'selectrow') {
                    $th = $('<input class="kloudspeaker-tableselect-header" type="checkbox"></input>').click(thClick);
                } else {
                    $th = $("<th>" + (col.type == 'action' ? "" : (col.title ? col.title : "")) + "</th>");
                    $th[0].colId = col.id;
                    if (col.sortable) {
                        $th.append("<span class='kloudspeaker-tableheader-sort'></span>").addClass("sortable");
                        if (!firstSortable) firstSortable = col.id;
                    }
                }

                if (col.id) $th.addClass("col-" + col.id);
                $th.appendTo($h);
            }
            var sortKey = false;
            if (firstSortable) sortKey = {
                id: firstSortable,
                asc: true
            };
            if (o.defaultSort) sortKey = o.defaultSort;
            var updateSort = function() {
                $e.find("th.sortable > .kloudspeaker-tableheader-sort").empty();
                if (!sortKey) return;
                var $col = $("th.col-" + sortKey.id + " > .kloudspeaker-tableheader-sort");
                $col.html("<i class='" + (sortKey.asc ? "fa fa-caret-up" : "fa fa-caret-down") + "'></i>");
            };
            $e.delegate("th.sortable", "click", function(e) {
                var $t = $(this);

                var id = $t[0].colId;
                if (sortKey && sortKey.id == id) {
                    sortKey.asc = !sortKey.asc;
                } else {
                    sortKey = {
                        id: id,
                        asc: true
                    };
                }
                updateSort();
                api.refresh();
            });
            updateSort();

            var $l = $("<tbody></tbody>").appendTo($e);
            var $eh = false;
            if (o.emptyHint) $eh = $("<tr class='kloudspeaker-table-empty-hint'><td colspan='" + o.columns.length + "'>" + o.emptyHint + "</td></tr>");
            $e.delegate(".kloudspeaker-tableselect", "change", function(e) {
                selectionChangedCb.fire();
                return false;
            });
            $e.delegate("a.kloudspeaker-tableaction", "click", function(e) {
                var $cell = $(this).parent();
                var $row = $cell.parent();
                var colId = $cell[0].colId;
                var item = $row[0].data;

                e.stopPropagation();
                if (o.onRowAction) o.onRowAction(colId, item);
                return false;
            });
            if (o.hilight) {
                $e.delegate("tr", "click", function(e) {
                    if (e.target && $(e.target).hasClass("kloudspeaker-tableselect")) return;

                    var $t = $(this);
                    var item = $t[0].data;
                    if (!item) return;
                    if ($t.hasClass("info")) {
                        $t.removeClass("info");
                        $t.find(".kloudspeaker-tableselect").prop("checked", false);
                        item = null;
                    } else {
                        $e.find("tr").removeClass("info");
                        selectAll(false);
                        $t.find(".kloudspeaker-tableselect").prop("checked", true);
                        $t.addClass("info");
                    }
                    selectionChangedCb.fire();
                    if (o.onHilight) o.onHilight(item);
                });
            }

            var setCellValue = function($cell, col, item) {
                $cell[0].colId = col.id;
                var v = item[col.id];
                if (col.cellClass) $cell.addClass(col.cellClass);
                if (col.type == 'selectrow') {
                    var $sel = $('<input class="kloudspeaker-tableselect" type="checkbox"></input>').appendTo($cell.empty());
                } else if (col.type == 'action') {
                    var html = '';
                    if (!col.enabled || col.enabled(item)) {
                        html = col.content;
                        if (col.formatter) html = col.formatter(item, v);
                        if (html) $("<a class='kloudspeaker-tableaction kloudspeaker-tableaction-" + col.id + "' title='" + col.title + "'></a>").html(html).appendTo($cell.empty());
                    }
                } else if (col.type == "input") {
                    var $s = $cell[0].ctrl;
                    if (!$s) {
                        $s = $('<input type="text"></input>').appendTo($cell).change(function() {
                            var v = $s.val();
                            $cell[0].ctrlVal = v;
                            if (o.selectOnEdit) setRowSelected(item, true);
                            if (col.onChange) col.onChange(item, v);
                        });
                        $cell[0].ctrl = $s;
                    }
                    var sv = v;
                    if (col.valueMapper) sv = col.valueMapper(item, v);
                    $s.val(sv);
                } else if (col.type == "select") {
                    var $sl = $cell[0].ctrl;
                    if (!$sl) {
                        var selOptions = [];
                        if (typeof(col.options) == "function") selOptions = col.options(item);
                        else if (utils.isArray(col.options)) selOptions = col.options;

                        var noneOption;
                        if (col.none) {
                            if (typeof(col.none) == "function") noneOption = col.none(item);
                            else noneOption = col.none;
                        }

                        var formatter;
                        if (col.formatter) {
                            formatter = function(sv) {
                                return col.formatter(item, sv);
                            };
                        }

                        $sl = controls.select($("<select></select>").appendTo($cell), {
                            values: selOptions,
                            title: col.title,
                            none: noneOption,
                            formatter: formatter,
                            onChange: function(v) {
                                $cell[0].ctrlVal = v;
                                if (o.selectOnEdit) setRowSelected(item, true);
                                if (col.onChange) col.onChange(item, v);
                            }
                        });
                        $cell[0].ctrl = $sl;
                    } else {}
                    var sv2 = v;
                    if (col.valueMapper) sv2 = col.valueMapper(item, v);
                    $sl.select(sv2);
                } else if (col.type == 'static') {
                    $cell.html(col.content || '');
                } else {
                    if (col.renderer) col.renderer(item, v, $cell);
                    else if (col.valueMapper) $cell.html(col.valueMapper(item, v));
                    else if (col.formatter) {
                        if (typeof(col.formatter) === 'function') $cell.html(col.formatter(item, v));
                        else $cell.html(col.formatter.format(v));
                    } else $cell.html(v);
                }
            };
            var addItem = function(item) {
                if ($eh) $eh.detach();
                var $row = $("<tr></tr>").appendTo($l);
                $row[0].data = item;
                if (o.onRow) o.onRow($row, item);

                for (var i = 0, j = o.columns.length; i < j; i++) {
                    var $cell = $("<td></td>").appendTo($row);
                    setCellValue($cell, o.columns[i], item);
                }
            };
            var updateRow = function($row) {
                $row.find("td").each(function() {
                    var $cell = $(this);
                    var index = $cell.index();
                    setCellValue($cell, o.columns[index], $row[0].data);
                });
            };
            var updateHint = function() {
                if (!$eh) return;
                var count = $l.find("tr").length;
                if (count === 0) $eh.appendTo($l);
                else $eh.hide();
            };

            var api = {
                findByKey: function(k) {
                    if (!o.key) return false;
                    var found = false;
                    $l.find("tr").each(function() {
                        var item = $(this)[0].data;
                        if (item[o.key] == k) {
                            found = item;
                            return false;
                        }
                    });
                    return found;
                },
                onSelectionChanged: function(cb) {
                    selectionChangedCb.add(cb);
                },
                getSelected: function() {
                    return getSelectedRows();
                },
                getValues: function() {
                    var values = {};
                    $l.find("td").each(function() {
                        var $cell = $(this);
                        var ctrlVal = $cell[0].ctrlVal;
                        if (!ctrlVal) return;

                        var $row = $cell.parent();
                        var item = $row[0].data;
                        var key = item[o.key];
                        if (!values[key]) values[key] = {};
                        values[key][$cell[0].colId] = ctrlVal;
                    });
                    return values;
                },
                get: function() {
                    var items = [];
                    $l.find("tr").each(function() {
                        var $row = $(this);
                        var item = $row[0].data;
                        items.push(item);
                    });
                    return items;
                },
                set: function(items) {
                    if ($eh) $eh.detach();
                    $l.empty();

                    if ((!o.remote || !o.remote.path) && sortKey)
                        items.sort(function(a, b) {
                            var av = a[sortKey.id];
                            var bv = b[sortKey.id];
                            if (av == bv) return 0;
                            return (sortKey.asc ? 1 : -1) * ((av < bv) ? -1 : 1);
                        });

                    $.each(items, function(i, item) {
                        addItem(item);
                    });
                    updateHint();
                    selectionChangedCb.fire();
                },
                add: function(item) {
                    if (!item) return;

                    if (utils.isArray(item)) {
                        for (var i = 0, j = item.length; i < j; i++) addItem(item[i]);
                    } else {
                        addItem(item);
                    }
                    updateHint();
                },
                update: function(item) {
                    if (!item) return;
                    var $row = findRow(item);
                    if (!$row) return;
                    updateRow($row);
                },
                remove: function(item) {
                    if (!item) return;
                    var $row = findRow(item);
                    if (!$row) return;
                    $row.remove();
                    updateHint();
                },
                refresh: function() {
                    var df = $.Deferred();
                    if (!o.remote || !o.remote.path) {
                        if (sortKey)
                            api.set(api.get());
                        return df.resolve();
                    }
                    var queryParams = {
                        count: perPageMax,
                        start: dataInfo ? dataInfo.start : 0,
                        sort: sortKey
                    };
                    if (o.remote.queryParams) {
                        var p = o.remote.queryParams(dataInfo);
                        if (p) queryParams = $.extend(queryParams, p);
                    }
                    var pr = service.post(o.remote.path, queryParams).done(function(r) {
                        if (o.remote.paging) {
                            dataInfo = {
                                start: r.start,
                                count: r.count,
                                total: r.total
                            };
                            refreshPagingControls();
                        } else dataInfo = false;
                        if (o.remote.onData) o.remote.onData(r);
                        api.set(r.data);
                        df.resolve();
                    }).fail(df.reject);
                    if (o.remote.onLoad) o.remote.onLoad(pr);
                    return df;
                }
            };
            return api;
        },

        select: function(e, o) {
            var $e = (typeof(e) === "string") ? $("#" + e) : e;
            if (!$e || $e.length === 0) return false;
            $e.empty();

            var addItem = function(item) {
                var $row = $("<option></option>").appendTo($e);
                if (item == o.none) {
                    $row.html(item);
                } else {
                    if (o.renderer) o.renderer(item, $row);
                    else {
                        var c = "";
                        if (o.formatter)
                            c = o.formatter(item);
                        else if (o.title)
                            c = item[o.title];
                        else if (typeof(item) === "string")
                            c = item;
                        $row.html(c);
                    }
                }
                $row[0].data = item;
            };

            var getSelected = function() {
                var s = $e.find('option:selected');
                if (!s || s.length === 0) return null;
                var item = s[0].data;
                if (item == o.none) return null;
                return item;
            }

            if (o.onChange) {
                $e.change(function() {
                    o.onChange(getSelected());
                });
            }

            var api = {
                add: function(item) {
                    if (!item) return;

                    if (utils.isArray(item)) {
                        for (var i = 0, j = item.length; i < j; i++) addItem(item[i]);
                    } else {
                        addItem(item);
                    }
                },
                select: function(item) {
                    var $c = $e.find("option");

                    if (item !== undefined && typeof(item) === 'number') {
                        if ($c.length >= item) return;
                        $($c[item]).prop("selected", true);
                        return;
                    }

                    var find = item;
                    if (o.none && !find) find = o.none;

                    for (var i = 0, j = $c.length; i < j; i++) {
                        if ($c[i].data == find || $c[i].text == find) {
                            $($c[i]).prop("selected", true);
                            return;
                        }
                    }
                },
                get: getSelected,
                set: this.select,
                selected: getSelected
            };
            if (o.none) api.add(o.none);
            if (o.values) {
                api.add(o.values);
                if (o.value) api.select(o.value);
            }
            return api;
        },

        radio: function(e, h) {
            var rid = e.addClass("btn-group").attr('id');
            var items = e.find("button");

            var select = function(item) {
                items.removeClass("active");
                item.addClass("active");
            }

            items.click(function() {
                var i = $(this);
                var ind = items.index(i);
                select(i);

                var id = i.attr('id');
                if (h && rid && h.onRadioChanged) h.onRadioChanged(rid, id, ind);
            });

            return {
                set: function(ind) {
                    select($(items[ind]));
                }
            };
        },

        datepicker: function(e, o) {
            if (!e) return false;
            if (!o) o = {};
            var $e = (typeof(e) === "string") ? $("#" + e) : e;
            if (!$.fn.datetimepicker.dates.kloudspeaker) {
                $.fn.datetimepicker.dates.kloudspeaker = {
                    days: loc.get('days'),
                    daysShort: loc.get('daysShort'),
                    daysMin: loc.get('daysMin'),
                    months: loc.get('months'),
                    monthsShort: loc.get('monthsShort'),
                    today: loc.get('today'),
                    weekStart: loc.get('weekStart')
                };
            }
            var val = o.value || null;
            var fmt = o.format || loc.get('shortDateTimeFormat');
            fmt = fmt.replace(/\b[h]\b/, "hh");
            fmt = fmt.replace(/\b[M]\b/, "MM");
            fmt = fmt.replace(/\b[d]\b/, "dd");
            fmt = fmt.replace("tt", "PP");
            var $dp = $e.datetimepicker({
                format: fmt,
                language: "kloudspeaker",
                pickTime: o.time || true,
                pickSeconds: (fmt.indexOf('s') >= 0)
            }).on("changeDate", function(ev) {
                val = ev.date;
            });

            var picker = $dp.data('datetimepicker');
            if (val) picker.setDate(val);

            var api = {
                get: function() {
                    if (val)
                        return new Date(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), val.getUTCHours(), val.getUTCMinutes(), val.getUTCSeconds());
                    return val;
                },
                set: function(d) {
                    val = (d != null ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())) : null);
                    picker.setDate(val);
                },
                _remove: function() {
                    picker.deinit();
                }
            };
            $dp.data("kloudspeaker-datepicker", api);
            return api;
        },

        editableLabel: function(o) {
            var $e = $(o.element);
            var id = $e.attr('id');
            var originalValue = o.value || $e.html().trim();
            if (!id) return;

            $e.addClass("editable-label").hover(function() {
                $e.addClass("hover");
            }, function() {
                $e.removeClass("hover");
            });

            var $label = $("<label></label>").appendTo($e.empty());
            var $editor = $("<input></input>").appendTo($e);
            var ctrl = {
                value: function(v) {
                    originalValue = v;
                    if (originalValue || !o.hint) {
                        $e.removeClass("hint");
                        $label.html(originalValue);
                    } else {
                        $e.addClass("hint");
                        $label.html(o.hint);
                    }
                    $editor.val(originalValue);
                }
            };
            ctrl.value(originalValue);

            var onFinish = function() {
                var v = $editor.val();
                if (o.isvalid && !o.isvalid(v)) return;

                $editor.hide();
                $label.show();
                if (originalValue != v) {
                    if (o.onedit) o.onedit(v);
                    ctrl.value(v);
                }
            };
            var onCancel = function() {
                $editor.hide();
                $label.show();
                ctrl.value(originalValue);
            };

            $editor.hide().bind("blur", onFinish).keyup(function(e) {
                if (e.which == 13) onFinish();
                else if (e.which == 27) onCancel();
            });

            $label.bind("click", function() {
                $label.hide();
                $editor.show().focus();
            });

            return ctrl;
        },

        slidePanel: function($e, o) {
            if (!$e) return;
            var $p = dom.template("kloudspeaker-tmpl-slidepanel").appendTo($e);
            if (o.relative) $p.addClass("relative");
            var $content = $p.find(".kloudspeaker-slidepanel-content");
            if (o.resizable) {
                $p.resizable({
                    handles: "n"
                }).bind("resize", function(e, ui) {
                    $(this).css("top", "auto");
                });
            }

            var api = {
                getContentElement: function() {
                    return $content;
                },
                show: function($c, h) {
                    if ($c) $content.empty().append($c);
                    $content.parent().scrollTop(0);
                    $p.animate({
                        "height": h + "px"
                    }, 500);
                },
                hide: function() {
                    $p.animate({
                        "height": "0px"
                    }, 500);
                },
                remove: function() {
                    $p.remove();
                }
            };
            $p.find(".close").click(api.hide);
            return api;
        },

        tooltip: function($c, o) {
            if (!$c) return;

            $c.tooltip($.extend({}, {
                placement: "bottom",
                title: "",
                trigger: "hover"
            }, o));

        }
    };
    return controls;
});
