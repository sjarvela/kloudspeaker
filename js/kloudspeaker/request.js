define(['kloudspeaker/utils'], function(utils) {
    //TODO remove global references

    var request = {
        getParam: function(name) {
            if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search))
                return decodeURIComponent(name[1]);
        },
        getParams: function() {
            return utils.getUrlParams(location.search);
        },
        getBaseUrl: function(url) {
            var param = url.lastIndexOf('?');
            if (param >= 0) url = url.substring(0, param);

            var dash = url.lastIndexOf('/');
            return url.substring(0, dash + 1);
        },
        getPageUrl: function(url) {
            var param = url.lastIndexOf('?');
            if (param >= 0) url = url.substring(0, param);
            return url;
        }
    };

    return request;
});
