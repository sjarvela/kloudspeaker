import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    ServiceBase
}
from 'kloudspeaker/service/service-base';

let logger = LogManager.getLogger('session-service');

@
inject(ServiceBase)
export class SessionService {
    constructor(service) {
        logger.debug("Session service");
        this.service = service;        
    }

    sessionInfo() {
    	return this.service.get('session/info');
    }

    login(username, password) {
    	return this.service.post('session/authenticate', { username: username, password: password });
    }

    logout() {
    	return this.service.post('session/logout');
    }
}