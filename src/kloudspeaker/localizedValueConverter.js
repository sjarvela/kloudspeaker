import {
    inject,
    LogManager
}
from 'aurelia-framework';

import {
    Localization
} from 'kloudspeaker/localization';

@
inject(Localization)
export class LocalizedValueConverter {

    constructor(localization) {
        let that = this;
        this.localization = localization;
    }

    toView(value, format) {
        if (!value) return "";
        if (value.startsWith("i18n:")) return this.localization.get(value.substring(5));

        return value;
    }
}
