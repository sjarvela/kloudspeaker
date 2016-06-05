define(['kloudspeaker/localization', 'kloudspeaker/utils', 'durandal/composition', 'knockout', 'jquery'], function(texts, utils, composition, ko, $) {
    var ctor = function() {};

    ctor.prototype.activate = function(settings) {
        var that = this;

        this.settings = settings;
        if (settings.config) this.settings = settings.config;

        this.settings.loading = ko.observable(false);
        this.settings.paging = ko.observable(null);

        if (settings.tools)
            _.each(settings.tools, function(t) {
                t._disabled = ko.observable(false);
            });

        if (!settings.values) {
            if (settings.remote) {
                settings.values = ko.observableArray([]);

                var paging = this.settings.remote.paging || {};
                settings.paging({
                    maxPerPage: paging.maxPerPage || 50,
                    page: paging.page || 1
                });
                if (settings.remote.refresh) settings.remote.refresh.listen(function() {
                    that.reload();
                });
            }
        }

        if (settings.refresh) settings.refresh.listen(function() {
            that.reload();
        });

        if (this.settings.cols.subscribe)
            this.settings.cols.subscribe(function(v) {
                that._updateCols();
            });
        if (settings.values && this.settings.values.subscribe)
            this.settings.values.subscribe(function(v) {
                that._updateContent(v);
                that._onSelectionChanged(true);
            });
        if (this.settings.hilight && this.settings.hilight.subscribe)
            this.settings.hilight.subscribe(function(h) {
                that._updateHilight();
            });
        if (this.settings.restrict && this.settings.restrict.subscribe)
            this.settings.restrict.subscribe(function(r) {
                if (r) {
                    that.$e.addClass("restricted");
                } else
                    that.$e.removeClass("restricted");
            });
    };
    ctor.prototype._updateHilight = function() {
        this.$e.find("tr.hilight").removeClass("hilight");

        var h = (typeof(this.settings.hilight) === 'function') ? this.settings.hilight() : this.settings.hilight;
        if (!h) return;

        var $row = this._getRowElement(h);
        if (!$row) return;

        $row.addClass("hilight");

        if (this.$e.hasClass("restricted"))
            $row[0].scrollIntoView();
    }
    ctor.prototype._updateTools = function() {
        if (!this.settings.tools) return;

        var selected = this.getSelected();
        _.each(this.settings.tools, function(t) {
            if (!t.depends) return;

            var disabled = false;
            if (t.depends == 'selection') disabled = (selected.length < 1);
            if (t.depends == 'selection-many') disabled = (selected.length < 2);
            if (t.depends == 'selection-none') disabled = (selected.length !== 0);
            t._disabled(disabled);
        });
    }
    ctor.prototype._updateSort = function() {
        this.$e.find("th.sortable > .sort-indicator").empty();
        if (!this.settings.sort) return;

        var $col = $("th.col-" + this.settings.sort.id + " > .sort-indicator");
        $col.html("<i class='" + (this.settings.sort.asc ? "fa fa-caret-up" : "fa fa-caret-down") + "'></i>");
    }
    ctor.prototype._updateCols = function() {
        var that = this;
        var firstSortable = null;
        var cols = (typeof(this.settings.cols) === 'function') ? this.settings.cols() : this.settings.cols;
        that._colsById = {};

        _.each(cols, function(col) {
            var $th;

            var title = "";
            if (col.type != 'select' && col.type != 'action') {
                title = (col.title ? col.title : (col.titleKey ? texts.get(col.titleKey) : ''));
            }

            $th = $("<th>" + title + "</th>");
            if (col.id) $th.addClass("col-" + col.id);
            $th[0].col = col;
            if (col.type == 'select') {
                $th.html('<input type="checkbox"></input>').addClass("select");
            }

            if (col.sortable) {
                $th.append("<span class='sort-indicator'></span>").addClass("sortable");
                if (!firstSortable) firstSortable = col;
            }
            that._colsById[col.id] = col;

            $th.appendTo(that.$thead);
        });
        if (!this.settings.sort && firstSortable) {
            this.settings.sort = {
                id: firstSortable.id,
                asc: true
            };
        }
        this._updateSort();
    }
    ctor.prototype._setCellValue = function($cell, row, col) {
            $cell[0].col = col;
            var v = col.id ? row[col.id] : null;

            if (col.cellClass) $cell.addClass(col.cellClass);
            if (col.tooltip) $cell.attr("title", (typeof(col.tooltip) === 'function' ? col.tooltip(row) : col.tooltip));
            if (col.type == 'select') {
                var $sel = $('<input type="checkbox"></input>').appendTo($cell.empty().addClass("select"));
            } else if (col.type == 'icon') {
                $cell.empty().html('<i class="fa fa-' + (typeof(col.name) === 'function' ? col.name(row) : col.name) + '"></i>');
            } else if (col.type == 'action') {
                var html = '';
                if ((typeof(col.enabled) === 'undefined') || col.enabled(row)) {
                    html = col.icon ? '<i class="fa fa-' + (typeof(col.icon) === 'function' ? col.icon(row) : col.icon) + '"></i>' : (col.content ? col.content : '');
                    if (col.formatter) html = col.formatter(item, v);
                    if (html) {
                        var title = col.title;
                        if (!title && col.titleKey) title = texts.get(col.titleKey);
                        $("<a title='" + title + "'></a>").html(html).appendTo($cell.empty().addClass("action"));
                    }
                }
                /*} else if (col.type == "input") {
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
                    $cell.html(col.content || '');*/
            } else {
                //if (col.renderer) col.renderer(item, v, $cell);
                if (col.content) $cell.html((typeof(col.content) === 'function') ? col.content(row, v) : col.content);
                else if (col.formatter) {
                    if (typeof(col.formatter) === 'function') $cell.html(col.formatter(row, v));
                    else $cell.html(col.formatter.format(v));
                } else $cell.html(v);
            }
        }
        /*var adjustingSelected = false;
        this.settings.allSelected.subscribe(function(a) {
            if (adjustingSelected) return;
            adjustingSelected = true;
            _.each(that.settings.values(), function(v) {
                v._selected(a);
            });
            adjustingSelected = false;
            onSelectionChanged();
        });*/

    ctor.prototype._onSelectionChanged = function(updateUI) {
        var selected = this.getSelected();
        if (this.settings.selected) this.settings.selected(selected);

        var allSelected = (selected.length == this.settings.values().length && selected.length > 0);
        this.$e.find("th.select input").prop('checked', allSelected);

        if (updateUI) {
            this.$e.find("td.select").each(function() {
                var $cell = $(this);
                var $row = $cell.parent();
                $cell.find("input").prop('checked', !!$row[0].data._selected);
            });
        }

        this._updateTools();
    };
    ctor.prototype._updateContent = function(newRows) {        
        var that = this;
        if (!that.$tbody) return;

        if (this.settings.sort && !this.settings.remote) {
            var col = that._colsById[that.settings.sort.id];
            if (col) {
                newRows = newRows.sort(function(a, b) {
                    var valA = col.sortValue ? col.sortValue(a) : a[that.settings.sort.id];
                    var valB = col.sortValue ? col.sortValue(b) : b[that.settings.sort.id];
                    var r = ((valA < valB) ? -1 : ( valA > valB ? 1 : 0)) * (that.settings.sort.asc ? 1 : -1);
                    return r;
                });
            }
        }

        that.$tbody.empty();

        var rows = newRows || ((typeof(this.settings.rows) === 'function') ? this.settings.rows() : this.settings.rows);
        var cols = (typeof(this.settings.cols) === 'function') ? this.settings.cols() : this.settings.cols;

        _.each(rows, function(row) {
            var $row = $("<tr></tr>").appendTo(that.$tbody);
            $row[0].data = row;

            _.each(cols, function(col) {
                var $cell = $("<td></td>").appendTo($row);
                that._setCellValue($cell, row, col);
            });

            if (that.settings.rowCls) {
                var cls = (typeof(that.settings.rowCls) === 'function') ? that.settings.rowCls(row) : that.settings.rowCls;
                if (cls) $row.addClass(cls);
            }
        });
    }
    ctor.prototype._getRowElement = function(row) {
        var result = null;
        this.$e.find("tr").each(function() {
            var $row = $(this);
            if ($row[0].data === row) {
                result = $row;
                return false;
            }
        });
        return result;
    }
    ctor.prototype.attached = function(e) {
        var that = this;
        var $e = $(e);
        this.$e = $e;

        if ($e.find("div[data-part='options']").length > 0) {
            $e.find(".accordion-toggle").hide();
        }

        $e.delegate("th.select input", "change", function(e) {
            var s = $(this).is(':checked');
            _.each(that.settings.values(), function(v) {
                v._selected = s;
            });
            that._onSelectionChanged(true);
            return false;
        });
        $e.delegate("td.select input", "change", function(e) {
            var $cell = $(this).parent();
            var $row = $cell.parent();
            var row = $row[0].data;
            row._selected = $(this).is(':checked');
            that._onSelectionChanged();
            return false;
        });
        $e.delegate("th.sortable", "click", function(e) {
            var $t = $(this);

            var col = $t[0].col;
            if (that.settings.sort && that.settings.sort.id == col.id) {
                that.settings.sort.asc = !that.settings.sort.asc;
            } else {
                that.settings.sort = {
                    id: col.id,
                    asc: true
                };
            }
            that._updateSort();
            that.reload();
        });
        $e.delegate("td.action a", "click", function(e) {
            var $cell = $(this).parent();
            var $row = $cell.parent();
            var col = $cell[0].col;
            var row = $row[0].data;

            e.stopPropagation();
            if (col.action) col.action(row);
            return false;
        });
    }
    ctor.prototype.compositionComplete = function() {
        this.$thead = this.$e.find("thead");
        this.$tbody = this.$e.find("tbody");

        if (!this.settings.sort && this.settings.defaultSort) {
            if (typeof(this.settings.defaultSort) === 'string') {
                this.settings.sort = {
                    id: this.settings.defaultSort
                }
            } else {
                this.settings.sort = this.settings.defaultSort;
            }
            if (typeof(this.settings.sort.id) === 'undefined') this.settings.sort = null;
            else if (typeof(this.settings.sort.asc) === 'undefined') this.settings.sort.asc = true;
        }

        this._updateCols();
        this._onSelectionChanged(true);
        var that = this;

        if (this.settings.remote) this.reload();
        else if (that.settings.hilight) {
            if (this.settings.hilight.subscribe)
                this.settings.hilight.subscribe(function(h) {
                    that._updateHilight();
                });
            that._updateHilight();
        }
    };
    ctor.prototype.getSelected = function() {
        return _.filter(this.settings.values(), function(v) {
            return v._selected;
        });
    };
    ctor.prototype.reload = function() {
        var df = $.Deferred();

        if (!this.settings.remote || !this.settings.remote.handler) {
            this._updateContent(this.settings.values());
            this._onSelectionChanged(true);
            return df.resolve();
        }

        var p = this.settings.paging();

        var queryParams = {
            count: p.maxPerPage,
            start: ((p.page - 1) * p.maxPerPage),
            sort: this.settings.sort
        };
        var that = this;
        var s = this.settings;
        s.loading(true);
        s.remote.handler(queryParams).done(function(r) {
            s.loading(false);
            s.values(r.data);
            var count = r.data.length;
            if (typeof(r.total) == 'string') r.total = parseInt(r.total, 10);

            s.paging({
                count: count,
                maxPerPage: p.maxPerPage,
                start: r.start,
                total: r.total,
                pages: (p.maxPerPage > 0 ? Math.ceil(r.total / p.maxPerPage) : 0),
                page: (p.maxPerPage > 0 ? (Math.floor(r.start / p.maxPerPage) + 1) : 0)
            });
            df.resolve();
        });
        return df;
    }

    /*ctor.prototype.getColTitle = function(col) {
        if (!!col.title) return col.title;
        if (col.titleKey) return texts.get(col.titleKey);
        return '';
    }*/

    /*ctor.prototype.getColContent = function(row, col) {
        if (col.content) return col.content(row, row[col.id]);
        else if (col.formatter) return col.formatter.format(row[col.id]);
        else if (col.id) return row[col.id];
        return '';
    }*/

    ctor.prototype.goto = function(i) {
        var cur = this.settings.paging().page;
        if (cur == i || i < 1 || i > this.settings.paging().pages) return;
        this.settings.paging().page = i;
        this.reload();
    }

    ctor.prototype.gotoPrev = function() {
        var cur = this.settings.paging().page;
        if (cur < 2) return;
        this.goto(cur - 1);
    }

    ctor.prototype.gotoNext = function() {
        var cur = this.settings.paging().page;
        if (cur >= this.settings.paging().pages) return;
        this.goto(cur + 1);
    }

    ctor.prototype.onTool = function(tool) {
        if (tool._disabled()) return;
        tool.action(this.getSelected());
    }

    return ctor;
});
