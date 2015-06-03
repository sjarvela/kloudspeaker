define(['kloudspeaker/ui/texts', 'kloudspeaker/utils', 'durandal/composition', 'knockout', 'jquery'], function(texts, utils, composition, ko, $) {
    var ctor = function() {};

    ctor.prototype.activate = function(settings) {
        var that = this;
        this.settings = settings;
        this.settings.loading = ko.observable(false);
        this.settings.paging = ko.observable(null);
        this.settings.allSelected = ko.observable(false);

        var adjustingSelected = false;
        this.settings.allSelected.subscribe(function(a) {
            if (adjustingSelected) return;
            adjustingSelected = true;
            _.each(that.settings.values(), function(v) {
                v._selected(a);
            });
            adjustingSelected = false;
            onSelectionChanged();
        });

        var onSelectionChanged = function() {
            var selected = that.getSelected();
            if (that.settings.selected) that.settings.selected(selected);

            var allSelected = (selected.length == that.settings.values().length);
            adjustingSelected = true;
            that.settings.allSelected(allSelected);
            adjustingSelected = false;

            updateTools();
        };
        var updateTools = function() {
            if (!settings.tools) return;

            var selected = that.getSelected();
            _.each(settings.tools, function(t) {
                if (!t.depends) return;

                var disabled = false;
                if (t.depends == 'selection') disabled = (selected.length < 1);
                if (t.depends == 'selection-many') disabled = (selected.length < 2);
                if (t.depends == 'selection-none') disabled = (selected.length != 0);
                t._disabled(disabled);
            });
        }
        var processValues = function(v) {
            _.each(v, function(vi) {
                if (typeof(vi._selected) != 'undefined') return;
                vi._selected = ko.observable(false);
                vi._selected.subscribe(function() {
                    if (adjustingSelected) return;
                    onSelectionChanged();
                });
            });
        };
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
        } else {
            processValues(settings.values());
        }

        this.settings.values.subscribe(function(v) {
            processValues(v);
        });
        updateTools();
    };
    ctor.prototype.attached = function(e) {
        var $e = $(e);
        if ($e.find("div[data-part='options']").length > 0) {
            $e.find(".accordion-toggle").hide();
        }
    }
    ctor.prototype.compositionComplete = function() {
        if (this.settings.remote) this.reload();
    };
    ctor.prototype.getSelected = function() {
        return _.filter(this.settings.values(), function(v) {
            return v._selected();
        });
    };
    ctor.prototype.reload = function() {
        if (!this.settings.remote || !this.settings.remote.handler) return;
        var p = this.settings.paging();

        var queryParams = {
            count: p.maxPerPage,
            start: ((p.page - 1) * p.maxPerPage),
            //sort: null  //TODO
        };
        var s = this.settings;
        s.loading(true);
        s.remote.handler(queryParams).done(function(r) {
            s.loading(false);
            s.values(r.data);
            var count = r.data.length;

            s.paging({
                count: count,
                maxPerPage: p.maxPerPage,
                start: r.start,
                total: r.total,
                pages: (p.maxPerPage > 0 ? Math.ceil(r.total / p.maxPerPage) : 0),
                page: (p.maxPerPage > 0 ? (Math.floor(r.start / p.maxPerPage) + 1) : 0)
            });
        });
    }

    ctor.prototype.getColTitle = function(col) {
        if (!!col.title) return col.title;
        if (col.titleKey) return texts.get(col.titleKey);
        return '';
    }

    ctor.prototype.getColContent = function(row, col) {
        if (col.content) return col.content(row, row[col.id]);
        else if (col.formatter) return col.formatter.format(row[col.id]);
        else if (col.id) return row[col.id];
        return '';
    }

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
