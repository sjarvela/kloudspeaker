import {
    inject, bindable, LogManager
}
from 'aurelia-framework';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

let logger = LogManager.getLogger('file-info');
let _plugins = [];

@
inject(Filesystem)
export class FileInfo {
	item;
    info;

    constructor(fs) {
        this.fs = fs;
    }

    activate(item) {
    	this.item = item;
    	logger.debug('info', this.item);

        var that = this;
        this.fs.itemInfo(this.item).then(i => {
            that.info = i;
        });
    }
}