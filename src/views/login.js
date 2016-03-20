import {
    bindable, inject, LogManager
}
from 'aurelia-framework';
import {
    Session
}
from 'kloudspeaker/session';

let logger = LogManager.getLogger('login');

@
inject(Session)
export class LoginView {
	username = '';
	password = '';

    constructor(session) {
        this.session = session;
    }

	login() {
		this.session.login(this.username, this.password);
	}
}