define(['kloudspeaker/service'], function(service) {
    return {
        getTypes: function() {
            return service.get("events/types");
        },

        getQueryHandler: function(paramsProvider, process) {
            return function(qp) {
                var params = qp || {};
                if (paramsProvider) {
                    var ep = paramsProvider(qp);
                    if (ep) params = $.extend(params, ep);
                }
                return service.post('eventlog/query', params).pipe(function(result) {
                    return result;
                });
            };
        }
    }
});
