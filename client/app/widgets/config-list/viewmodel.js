define(['kloudspeaker/localization', 'durandal/composition', 'knockout', 'jquery'], function(loc, composition, ko, $) {
    var ctor = function() {};
    
    ctor.prototype.activate = function(settings) {
        console.log("config-list");
        this.settings = settings;
    };
    ctor.prototype.getColTitle = function(col) {
        if (!!col.title) return col.title;
        if (col.titleKey) return loc.t(col.titleKey);
        return '';
    }

    return ctor;
});
