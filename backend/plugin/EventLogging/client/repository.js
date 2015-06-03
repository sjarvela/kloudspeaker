define(['kloudspeaker/service', 'kloudspeaker/utils'], function(service, utils) {
    return {
        getTypes: function() {
            return service.get("events/types");
        },

        getQueryHandler: function(paramsProvider, process) {
            return function(qp) {
                var params = qp || {};
                if (paramsProvider) {
                    var ep = paramsProvider(qp);                    
                    if (ep) {
                        if (ep.start_time) ep.start_time = utils.formatInternalTime(ep.start_time);
                        if (ep.end_time) ep.end_time = utils.formatInternalTime(ep.end_time);
                        params = $.extend(params, ep);
                    }
                }
                return service.post('eventlog/query', params).pipe(function(result) {
                    return result;
                });
            };
        }
    }
});
