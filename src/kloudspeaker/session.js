import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import {
    SessionService
}
from 'kloudspeaker/service/session-service';

import {
    ServiceBase
}
from 'kloudspeaker/service/service-base';

let logger = LogManager.getLogger('session');

@
inject(SessionService, EventAggregator, ServiceBase)
export class Session {
    _user = null;
    _data = null;

    constructor(sessionService, events, serviceBase) {
        this.service = sessionService;
        this.events = events;
        this.serviceBase = serviceBase;
    }

    isInitialized() {
        return this._data != null;
    }

    getUser() {
        return this._user;
    }

    getData() {
        return this._data;
    }

    isLoggedIn() {
        return this.isInitialized() && !!this._user;
    }

    initialize() {
        let that = this;
        return this.service.sessionInfo().then(info => {
            return that._initialize(info);
        });
    }

    _initialize(info) {
        this._data = info;

        if (info.authenticated) {
            this.serviceBase.sessionId = info.session_id;

            this._user = {
                id: info.user_id,
                name: info.username,
                type: info.user_type,
                lang: info.lang,
                admin: info.user_type == 'a',
                auth: info.user_auth
            };
        } else {
            this._user = null;
            this.serviceBase.sessionId = null;
        }

        var o = { user: this._user, data: this._data };
        this.events.publish('kloudspeaker/session/init', o);    //internal
        this.events.publish('kloudspeaker/session/start', o);

        return o;
    }

    login(username, password) {
        let that = this;
        return this.service.login(username, password).then(info => {
            that._initialize(info);
        });
    }

    logout() {
        return this.service.logout().then(info => {
            that._initialize(info);
        });
    }
}
