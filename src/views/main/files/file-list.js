import {
    customElement, bindable
}
from 'aurelia-framework';

@
customElement('file-list')
export class FileList {
    @bindable items;

    bind(bindingContext) {
    	this._onSelect = bindingContext['onSelect'].bind(bindingContext);
    	console.log('bind', bindingContext)
    }

    onSelect(item, $e) {
    	this._onSelect(item);
    }
}
