define(['kloudspeaker/localization', 'durandal/composition', 'knockout', 'jquery'], function(loc, composition, ko, $) {
    var ctor = function() {};

    ctor.prototype.activate = function(settings) {
        console.log("config-list");
        var that = this;
        this.settings = settings;
        if (!settings.values) {
            if (settings.remote) {
                settings.values = ko.observableArray([]);

                var paging = this.settings.remote.paging || {};
                settings.paging = ko.observable({
                    maxPerPage: paging.maxPerPage || 50,
                    start: 0
                });
                this.reload();
                if (settings.remote.refresh) settings.remote.refresh.listen(function() {
                    that.reload();
                });
            }
        }
    };
    ctor.prototype.reload = function() {
        if (!this.settings.remote || !this.settings.remote.handler) return;
        //var paging = this.settings.remote.paging || {};
        //var maxPerPage = paging.maxPerPage || 50;
        var p = this.settings.paging();

        //TODO paging
        var queryParams = {
            count: p.maxPerPage,
            start: p.start,
            //sort: null  //TODO
        };
        var s = this.settings;
        s.remote.handler(queryParams).done(function(r) {
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
            //TODO paging
        });
    }

    ctor.prototype.getColTitle = function(col) {
        if (!!col.title) return col.title;
        if (col.titleKey) return loc.t(col.titleKey);
        return '';
    }

    ctor.prototype.goto = function(i) {
        alert(i);
    }

    ctor.prototype.gotoPrev = function() {
        alert("prev");
    }

    ctor.prototype.gotoNext = function() {
        alert("next");
    }
    return ctor;
});
