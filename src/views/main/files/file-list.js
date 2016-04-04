import {
    customElement, inject, bindable, LogManager
}
from 'aurelia-framework';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

let logger = LogManager.getLogger('file-list');

let _cols = [{
    id: 'name'
}, {
    id: 'quickaction'
}, {
    id: 'type'
}]

@
customElement('file-list')
@
inject(Filesystem)
export class FileList {
    @bindable items;
    @bindable infoItem;
    //itemInfo = null;

    constructor(fs) {
        //this.fs = fs;
        this.cols = _cols;
    }

    bind(bindingContext) {
        //TODO read onSelect name from data-select etc
    	this._onSelect = bindingContext['onSelect'].bind(bindingContext);
    	logger.debug('bind', bindingContext)
    }

    onSelect(item, $e) {
    	this._onSelect(item);
    }

    getColValue(item, col) {
        if (col.id == 'name') return item.name;
        if (col.id == 'type') return item.is_file ? item.extension : '';
        return "-";
    }

    /*infoItemChanged() {
    	logger.debug('info', this.infoItem);
        this.itemInfo = null;
        var that = this;
        this.fs.itemInfo(this.infoItem).then(i => {
            that.itemInfo = i;
        });
    }*/
}
