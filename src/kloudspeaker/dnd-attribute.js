import { customAttribute, dynamicOptions, inject, DOM } from 'aurelia-framework';
import { DragAndDrop } from 'kloudspeaker/drag-and-drop';

@customAttribute('ks-draggable')
@dynamicOptions
@inject(DOM.Element, DragAndDrop)
export class DNDDragAttribute {
    cls;
    type;

    constructor(element, dnd) {
        console.log('dnd drag', element);
        this.element = element;
        this.dnd = dnd;
    }

    propertyChanged(propertyName, newValue, oldValue) {
        console.log(propertyName, newValue);
    }

    bind() {
        console.log('bind');
        var that = this;
        this.dnd.enableDrag($(this.element), this.cls, {
            onDragStart: function($e, e) {
                console.log('onDragStart');
                return { foo : 'bar'};
            },
            onDragEnd: function($e, e) {
                console.log('onDragEnd');
            }
        });
    }
}

@customAttribute('ks-droppable')
@dynamicOptions
@inject(DOM.Element)
export class DNDDropAttribute {
    constructor(element) {
        console.log('dnd drop', element);
        this.element = element;
    }

    propertyChanged(propertyName, newValue, oldValue) {
        console.log(propertyName, newValue);
    }
}
