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
    id: 'icon'
}, {
    id: 'name',
    extension: false
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

    onClick(item, col, $e) {
        logger.debug(col);
        if (col.id == 'name')
    	   this._onSelect(item);
    }

    getItemIcon(item) {
        if (item.is_file) {
            //TODO file type icons
            return 'file';
        }
        return 'folder';
    }

    canDrag(item) {
        logger.debug('can drag', item);
    }

    canDrop(item) {
        logger.debug('can drop', item);
    }

    getColValue(item, col) {
        if (col.id == 'name') {
            var name = item.name;
            if (col.extension) return name;
            var ei = name.lastIndexOf('.');
            if (ei < 0) return name;
            return name.substring(0, ei);
        }
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
