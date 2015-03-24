define(['durandal/composition', 'knockout', 'jquery'], function(composition, ko, $) {
    var ctor = function() {};
    ctor.prototype.editing = ko.observable(false);
    ctor.prototype.activate = function(settings) {
        console.log("inplace-editor");
        this.originalValue = settings.value;
        this.editing(false);
        this.settings = settings;
    };

    ctor.prototype.edit = function() {
        this.editing(true);
    };
    ctor.prototype.cancel = function() {
        this.settings.value = this.originalValue;
        this.editing(false);
    }
    ctor.prototype.onEdit = function() {
        if (!this.settings.action) return;
        if (this.settings.action(this.settings.value) === false) return;
        this.originalValue = this.settings.value;
        this.editing(false);
    };

    /*ctor.prototype.getHeaderText = function(item) {
        if (this.settings.headerProperty) {
            return item[this.settings.headerProperty];
        }
 
        return item.toString();
    };
 
    ctor.prototype.afterRenderItem = function(elements, item) {
        var parts = composition.getParts(elements);
        var $itemContainer = $(parts.itemContainer);
 
        $itemContainer.hide();
 
        $(parts.headerContainer).bind('click', function() {
            $itemContainer.toggle('fast');
        });
    };*/

    return ctor;
});
