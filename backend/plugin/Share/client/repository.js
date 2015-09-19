define(['kloudspeaker/service', 'kloudspeaker/utils'], function(service, utils) {
    var processShare = function(s) {
        if (typeof(s.active) == 'string')
            s.active = (s.active == '1');
        if (s.expiration) s.expiration = utils.parseInternalTime(s.expiration);
    };

    return {
        getShareOptions: function(itemId) {
            return service.get("share/items/" + itemId + '/options');
        },

        getShare: function(id, info) {            
            return service.get("share/" + id + (info ? '?info=1' : '')).pipe(function(r) {
                processShare(info ? r.share : r);
                return r;
            });
        },

        getUserShares: function() {
            return service.get("share/all/").pipe(function(result) {
                if (!result) return result;
                
                var users = utils.getKeys(result.shares);
                _.each(users, function(u) {
                    var list = result.shares[u];
                    _.each(list, processShare);
                });
                return result;
            });
        },

        getItemShares: function(item) {
            return service.get("share/items/" + item.id).pipe(function(result) {
                _.each(result, processShare);
                return result;
            });
        },

        quickShare: function(item) {
            return service.get("share/items/"+item.id+"/quick");
        },

        addItemShare: function(item, share) {
            return service.post("share/", {
                item: item.id,
                name: share.name,
                type: share.type,
                expiration: utils.formatInternalTime(share.expiration),
                active: share.active,
                restriction: share.restriction
            });
        },

        editShare: function(id, share) {
            return service.put("share/" + id, {
                id: id,
                name: share.name,
                type: share.type,
                expiration: utils.formatInternalTime(share.expiration),
                active: share.active,
                restriction: share.restriction
            });
        },

        removeShare: function(share) {
            return service.del("share/" + share.id);
        },

        removeShares: function(ids) {
            return service.del("share/list/", {
                list: ids
            });
        },

        activateShares: function(ids) {
            return service.put("share/list/", {
                ids: ids,
                active: true
            });
        },

        deactivateShares: function(ids) {
            return service.put("share/list/", {
                ids: ids,
                active: false
            });
        },

        removeAllItemShares: function(item) {
            return service.del("share/items/" + item.id);
        },

        getQueryHandler: function(paramsProvider, process) {
            return function(qp) {
                var params = qp || {};
                if (paramsProvider) {
                    var ep = paramsProvider(qp);
                    if (ep) params = $.extend(params, ep);
                }
                return service.post('share/query', params).pipe(function(result) {
                    _.each(result.data, processShare);
                    if (process) return process(result);
                    return result;
                });
            };
        }
    };
});
