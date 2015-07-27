define(['durandal/composition', 'knockout', 'jquery', 'kloudspeaker/localization', 'kloudspeaker/ui/controls'], function(composition, ko, $, loc, controls) {
    var ctor = function() {};
    ctor.prototype.activate = function(settings) {
        this.settings = settings;
    };
    ctor.prototype.attached = function(e) {
        var that = this;
        var $e = $(e);
        var $input = $e.find("input");

        that.api = controls.datepicker($e, {
            format: loc.get('shortDateTimeFormat'),
            time: true,
            value: that.settings.value()
        });
        $e.on("changeDate", function(ev) {
            that.settings.value(that.api.get());
        });
        that.settings.value.subscribe(function(newValue) {
            that.api.set(newValue);
        });
    }
    ctor.prototype.detached = function(v, p) {
        this.api._remove();
    }
    return ctor;
});
