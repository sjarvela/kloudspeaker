import {
    inject, bindable, LogManager
}
from 'aurelia-framework';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

let logger = LogManager.getLogger('search');

@
inject(Filesystem)
export class Search {

    filesHeader = 'views/main/files/search-header';

    constructor(fs) {
        this.fs = fs;
    }

    activate(params) {
        if (!params) return;

        var that = this;
        logger.debug('activate');
        that.value = params.q;

        return new Promise(function(resolve){
            that.fs.search(that.value).then(r => {
                var items = [];
                _.each(_.keys(r.matches), function(k) {
                    items.push(r.matches[k].item);
                });
                resolve({ items: items });
            });
        });
    }
}
