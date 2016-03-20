define(['kloudspeaker/utils'], function(utils) {
    var request = {
        getParam: function(name) {
            if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search))
                return decodeURIComponent(name[1]);
        },
        param: this.getParam,

        getParams: function(u) {
            var url = (u || this.getUrl());
            return utils.getUrlParams(url);
        },
        params: this.getParams,

        getUrl: function() {
            return window.location.href;
        },

        getBaseUrl: function(u) {
            var url = (u || this.getUrl());
            var param = url.lastIndexOf('?');
            if (param >= 0) url = url.substring(0, param);

            var dash = url.lastIndexOf('/');
            return url.substring(0, dash + 1);
        },
        getPageUrl: function(u) {
            var url = (u || this.getUrl());
            var param = url.lastIndexOf('?');
            if (param >= 0) url = url.substring(0, param);
            return url;
        }
    };

    return request;
});
