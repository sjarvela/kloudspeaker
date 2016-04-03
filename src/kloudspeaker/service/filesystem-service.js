import {
    inject, LogManager
}
from 'aurelia-framework';

import {
    ServiceBase
}
from 'kloudspeaker/service/service-base';

let logger = LogManager.getLogger('filesystem-service');

@
inject(ServiceBase)
export class FilesystemService {
    constructor(service) {
        logger.debug("Filesystem service");
        this.service = service;        
    }

    folderInfo(fid, hierarchy, data) {
    	return this.service.post('filesystem/' + (fid ? fid : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), data);
    }

    itemInfo(id, data) {
        //TODO rename details->info?
        return this.service.post('filesystem/' + id+ "/details/", {data: data});
    }

    items(fid) {
        return this.service.get('filesystem/'+fid+'/items');
    }
}