import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import {
    Session
}
from 'kloudspeaker/session';

import {
    FilesystemService
}
from 'kloudspeaker/service/filesystem-service';

import {
    Plugins
}
from 'kloudspeaker/plugins';

let logger = LogManager.getLogger('filesystem');

@
inject(Session, FilesystemService, EventAggregator, Plugins)
export class Filesystem {
    _roots = [];

    constructor(session, filesystemService, events, plugins) {
        this.session = session;
        this.service = filesystemService;
        this.events = events;
        this.plugins = plugins;

        events.subscribe(
            'kloudspeaker/session/init',
            this._initializeSession.bind(this));
        this._initializeSession();
    }

    _initializeSession() {
        if (!this.session.isLoggedIn()) {
            this._roots = [];
            return;
        }
        this._roots = this.session.getData().folders;
    }

    roots() {
        return this._roots;
    }

    folderInfo(parent, hierarchy) {
        var pid = (typeof parent === "object") ? parent.id : parent;
        return this.service.folderInfo(pid, hierarchy).then(items => {
            //process
            return items;
        });
    }

    itemInfo(item) {
        var data = this.plugins.getRequestData(item, 'item-info');

        var id = (typeof item === "object") ? item.id : item;
        return this.service.itemInfo(id, data).then(info => {
            //process
            return info;
        });
    }

    items(parent) {
        var pid = (typeof parent === "object") ? parent.id : parent;
        return this.service.items(pid).then(items => {
            //process
            return items;
        });
    }

}
