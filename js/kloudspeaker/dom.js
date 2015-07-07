define(['kloudspeaker/settings', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/resources'], function(settings, utils, ui, resources) {
    //TODO remove global references

    var _hiddenInd = 0;
    var md = {};
    md._hiddenLoaded = [];

    md.importScript = function(url) {
        var u = resources.url(url);
        if (!u)
            return $.Deferred().resolve().promise();
        var df = $.Deferred();
        $.getScript(u, df.resolve).fail(function(e) {
            //TODO rewrite
            new ui.FullErrorView("Failed to load script ", "<code>" + u + "</code>").show();
        });
        return df.promise();
    };

    md.importCss = function(url) {
        var u = resources.url(url);
        if (!u) return;

        var link = $("<link>");
        link.attr({
            type: 'text/css',
            rel: 'stylesheet',
            href: utils.noncachedUrl(u)
        });
        $("head").append(link);
    };

    md.loadContent = function(contentId, url, cb) {
        if (md._hiddenLoaded.indexOf(contentId) >= 0) {
            if (cb) cb();
            return;
        }
        var u = resources.url(url);
        if (!u) {
            if (cb) cb();
            return;
        }
        var id = 'kloudspeaker-tmp-' + (_hiddenInd++);
        $('<div id="' + id + '" style="display:none"/>').appendTo($("body")).load(utils.noncachedUrl(u), function() {
            md._hiddenLoaded.push(contentId);
            if (cb) cb();
        });
    };

    md.loadContentInto = function($target, url, handler, process) {
        var u = resources.url(url);
        if (!u) return $.Deferred().resolve().promise();

        var df = $.Deferred();
        $target.load(utils.noncachedUrl(u), function() {
            if (process) ui.process($target, process, handler);
            if (typeof handler === 'function') handler();
            else if (handler.onLoad) handler.onLoad($target);
            df.resolve();
        });
        return df;
    };

    md.template = function(id, data, opt) {
        var templateId = id;
        if (templateId.startsWith("#")) templateId = templateId.substring(1);
        if (settings["resource-map"] && settings["resource-map"]["template:" + id])
            templateId = settings["resource-map"]["template:" + id];
        return $("#" + templateId).tmpl(data, opt);
    };

    md.bind = function(model, activationData, $e) {
        if (!$e || $e.length === 0) return;
        if (model.activate) model.activate(activationData);
        ko.applyBindings(model, $e[0]);
        ui.process($e, ['localize']);
        if (model.attached) model.attached($e);
    };

    return md;
});
