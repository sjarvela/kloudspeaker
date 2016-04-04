import {
    bindable, inject, LogManager
}
from 'aurelia-framework';

import {Router} from 'aurelia-router';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

import _ from 'underscore';

let logger = LogManager.getLogger('files');

@
inject(Filesystem, Router)
export class FilesView {
    items = [];
    @bindable infoItem = null;
    hierarchy = [];

    constructor(fs, r) {
        this.fs = fs;
        this.router = r;
    }

    attached() {
    }

    activate(params, route, inst) {
        var that = this;
        return this.fs.folderInfo((params && params.id) ? params.id : false, true).then(l => {
            that.items = l.items;
            that.hierarchy = l.hierarchy;
        });
    }

    getSubViews() {
        return Promise.resolve(_.map(this.fs.roots(), function(r) {
            return {
                title: r.name,
                path: r.id
            }
        }));
    }

    getActiveSubView() {
        if (!this.hierarchy) return null;
        return this.hierarchy[0].id;
    }

    onSelect(item) {
        logger.debug(item);
        if (!item.is_file)
            this.router.navigateToRoute('files', { id: item.id });
        else
            this.showInfo(item)
    }

    showInfo(item) {
        if (this.infoItem == item) this.infoItem = null;
        else this.infoItem = item;
    }
}
