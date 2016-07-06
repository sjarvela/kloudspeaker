import {
    bindable,
    inject,
    LogManager
}
from 'aurelia-framework';

import { I18N } from 'aurelia-i18n';

import {
    Session
}
from 'kloudspeaker/session';

import {
    app_config
}
from 'app-config';

import {
    EventAggregator
}
from 'aurelia-event-aggregator';

import _ from 'underscore';

let logger = LogManager.getLogger('localization');

@
inject(Session, EventAggregator, app_config, I18N)
export class Localization {
    plugins = {};

    constructor(session, events, appConfig, i18n) {
        this.session = session;
        this.events = events;
        this.appConfig = appConfig;
        this.i18n = i18n;
    }

    initialize() {
        var that = this;
        return new Promise(function(resolve) {
            var user = that.session.getUser();

            // TODO getLang etc, TODO default lang from settings
            var lang = user ? user.lang : null;
            if (!lang) lang = 'en';
            that.i18n.setLocale('en').then(() => { resolve(); });
            /*that.i18next.init({
                debug: true,
                defaultNS: 'kloudspeaker',
                ns: ['kloudspeaker'],
                lng: 'en',
                load: 'currentOnly',
                fallbackLng: undefined,
                backend: {
                    // path where resources get loaded from 
                    loadPath: 'localization/{{ns}}.{{lng}}.json',

                    allowMultiLoading: false
                }
            }, (err, t) => {
                if (err) logger.error(err);
                else {
                    var user = that.session.getUser();

                    // TODO getLang etc, TODO default lang from settings
                    var lang = user ? user.lang : null;
                    if (!lang) lang = 'en';
                    that.setLanguage(lang).then(() => { resolve(); });
                }
            });*/
        });
    }

    setLanguage(lang) {
        var that = this;
        return new Promise(function(resolve) {
            that.i18n.changeLanguage(lang, (err, t) => {
                that.events.publish('localization/init', { lang: lang });
                resolve();
            });
        });
    }

    get(key) {
        return this.i18n.tr(key);
    }
}
