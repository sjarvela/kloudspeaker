import {
    inject,
    LogManager
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

let logger = LogManager.getLogger('session');

@
inject(SessionService, EventAggregator)
export class Session {
    _user = null;
    _data = null;

    constructor(sessionService, events) {
        this.service = sessionService;
        this.events = events;
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

    getId() {
        return this._data ? this._data.session_id : null;
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
        }

        var o = { user: this._user, data: this._data };
        this.events.publish('kloudspeaker/session/init', o); //internal
        this.events.publish('kloudspeaker/session/start', o);

        return o;
    }

    end(dontSend) {
        this._data = null;
        this._user = null;

        this.events.publish('kloudspeaker/session/end', {});
        if (!dontSend)
            return this.logout();
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
