import {
    customElement, inject, bindable, LogManager
}
from 'aurelia-framework';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

let logger = LogManager.getLogger('file-list');

@
customElement('file-list')
@
inject(Filesystem)
export class FileList {
    @bindable items;
    @bindable infoItem;
    itemInfo = null;

    constructor(fs) {
        this.fs = fs;
    }

    bind(bindingContext) {
    	this._onSelect = bindingContext['onSelect'].bind(bindingContext);
    	logger.debug('bind', bindingContext)
    }

    onSelect(item, $e) {
    	this._onSelect(item);
    }

    infoItemChanged() {
    	logger.debug('info', this.infoItem);
        this.itemInfo = null;
        var that = this;
        this.fs.itemInfo(this.infoItem).then(i => {
            that.itemInfo = i;
        });
    }
}
