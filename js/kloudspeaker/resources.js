define(['kloudspeaker/settings', 'kloudspeaker/utils'], function(settings, utils) {
    var resources = {
        url: function(u) {
            if (!settings["resource-map"]) return u;

            var urlParts = utils.breakUrl(u);
            if (!urlParts) return u;

            var mapped = settings["resource-map"][urlParts.path];
            if (mapped === undefined) return u;
            if (mapped === false) return false;

            return mapped + urlParts.paramsString;
        }
    };

    return resources;
});
