import {
    customElement,
    inject,
    bindable,
    LogManager
}
from 'aurelia-framework';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

let logger = LogManager.getLogger('file-icon-list');

@
customElement('file-icon-list')
@
inject(Filesystem)
export class FileIconList {
    @bindable items;
    @bindable infoItem;

    constructor(fs) {}

    bind(bindingContext) {
        //TODO read onSelect name from data-select etc
        this._onSelect = bindingContext['onSelect'].bind(bindingContext);
        logger.debug('bind', bindingContext)
    }

    onClick(item, $e) {
        this._onSelect(item);
    }
}
