import {
    bindable,
    inject,
    LogManager
}
from 'aurelia-framework';

import {
    Container
}
from 'aurelia-dependency-injection';

import { Router } from 'aurelia-router';

import {
    Filesystem
}
from 'kloudspeaker/filesystem';

import {
    Views
}
from 'kloudspeaker/views';

import _ from 'underscore';

let logger = LogManager.getLogger('files');

@
inject(Filesystem, Router, Views, Container)
export class FilesView {
    viewType = 'list';
    items = [];
    @bindable infoItem = null;
    hierarchy = [];
    searchValue = "";

    constructor(fs, r, views, dic) {
        this.fs = fs;
        this.router = r;
        this.views = views;
        this.dic = dic;
    }

    attached() {}

    activate(params, route, inst) {
        if (!params) return;

        var that = this;

        this.items = null;
        this.hierarchy = null;
        this.model = null;

        if (params && params.id) {
            var sv = this.views.get(params.id);
            if (sv) {
                if (sv.type == 'model') {
                    return new Promise(function(resolve) {
                        //TODO module for importing
                        var mid = sv.moduleId.split(':');
                        var moduleName = mid[1];
                        mid = mid[0];
                        System.import(mid).then(svm => {
                            var svmi = that.dic.invoke(svm[moduleName]);
                            that.model = svmi;

                            svmi.activate(params).then(rs => {
                                that.items = rs.items;
                                that.hierarchy = rs.hierarchy;
                                resolve();
                            });
                        });
                    });
                }
            }
        }

        //default
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
        return {
            title: this.hierarchy[0].name,
            path: this.hierarchy[0].id
        };
    }

    setViewType(vt) {
        this.viewType = vt;
    }

    search() {
        if (!this.searchValue) return;
        this.router.navigateToRoute('files', { id: 'search', q: this.searchValue }, { replace: true });
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
