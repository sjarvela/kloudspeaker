define(['durandal/composition', 'knockout', 'jquery'], function(composition, ko, $) {
    var ctor = function() {};
    
    ctor.prototype.activate = function(settings) {
        console.log("config-list");
        this.settings = settings;
    };

    return ctor;
});
