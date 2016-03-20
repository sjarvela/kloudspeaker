import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    ServiceBase
}
from 'kloudspeaker/service/service-base';

let logger = LogManager.getLogger('permission-service');

@
inject(ServiceBase)
export class PermissionService {
    constructor(service) {
        logger.debug("Permission service");
        this.service = service;
    }

    itemPermissions(id) {
        return this.service.get('permissions/items/' + itemId);
    }
}
