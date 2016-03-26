import {
    customElement, bindable, LogManager
}
from 'aurelia-framework';

let logger = LogManager.getLogger('file-list');

@
customElement('file-list')
export class FileList {
    @bindable items;
    @bindable infoItem;

    bind(bindingContext) {
    	this._onSelect = bindingContext['onSelect'].bind(bindingContext);
    	logger.debug('bind', bindingContext)
    }

    onSelect(item, $e) {
    	this._onSelect(item);
    }

    infoItemChanged() {
    	logger.debug('info', this.infoItem);
    }
}
