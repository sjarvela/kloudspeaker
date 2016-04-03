import {
    inject, bindable, LogManager
}
from 'aurelia-framework';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

import {
    Plugins
}
from 'kloudspeaker/plugins';

let logger = LogManager.getLogger('item-info');
let _plugins = [];

@
inject(Filesystem, Plugins)
export class ItemInfo {
	item;
    info;
    contents = [];
    activeContent = null;

    constructor(fs, plugins) {
        this.fs = fs;
        this.plugins = plugins;
    }

    activate(item) {
    	this.item = item;
    	logger.debug('info', this.item);

        var that = this;
        this.fs.itemInfo(this.item).then(i => {
            that.contents = that.plugins.getContent('item-info', item, i.plugins);
            if (that.contents.length > 0) that.activateContent(that.contents[0]);
            that.info = i;
        });
    }

    activateContent(c, $e) {
        if ($e) $e.stopPropagation();
        logger.debug("active content", c);
        this.activeContent = c;
    }
}