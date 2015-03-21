define("kloudspeaker/core_service", ['kloudspeaker/service'],
    function(service) {
        var cs = service.get();//("api/v1/");
        return cs;
    }
);

define('kloudspeaker/ui/files', [], function() {
    var itemDetailsProviders = [];
    return {
        itemDetails: {
            registerProvider: function(h) {
                itemDetailsProviders.push(h);
            },
            getRequestData: function(item) {
                var r = {};
                _.each(itemDetailsProviders, function(h) {
                    if (!h.getRequestData) return;
                    var hd = h.getRequestData(item);
                    if (!hd) return;
                    r[h.id] = hd;
                });
                return r;
            },
            get: function(item, data) {
                var r = [];
                _.each(itemDetailsProviders, function(h) {
                    var hi = h.get(item, data[h.id]);
                    if (!hi) return;
                    r.push(hi);
                });
                return r;
            }
        }
    }
});

define([
    "kloudspeaker/core",
    "durandal/composition",
    "knockout",
    "jquery",
    "i18next",
    "bootstrap",
    "knockout-bootstrap",
    "underscore"
], function(core, composition, ko, $, i18n) {
    var _i18n = function(e, va) {
        var value = ko.unwrap(va());
        var loc = i18n.t(value) || '';
        var $e = $(e);
        var target = $e.attr('data-i18n-bind-target');
        if (target && target != 'text')
            $a.attr(target, loc);
        else
            $e.text(loc);
    }
    composition.addBindingHandler('i18n', {
        init: _i18n,
        update: _i18n
    });
});
