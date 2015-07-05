define(['kloudspeaker/utils'], function(utils) {
    //TODO remove global references

    var _hiddenInd = 0;
    var md = {};
    md._hiddenLoaded = [];

    md.importScript = function(url) {
        var u = kloudspeaker.resourceUrl(url);
        if (!u)
            return $.Deferred().resolve().promise();
        var df = $.Deferred();
        $.getScript(u, df.resolve).fail(function(e) {
            new kloudspeaker.ui.FullErrorView("Failed to load script ", "<code>" + u + "</code>").show();
        });
        return df.promise();
    };

    md.importCss = function(url) {
        var u = kloudspeaker.resourceUrl(url);
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
        var u = kloudspeaker.resourceUrl(url);
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
        var u = kloudspeaker.resourceUrl(url);
        if (!u) return $.Deferred().resolve().promise();

        var df = $.Deferred();
        $target.load(utils.noncachedUrl(u), function() {
            if (process) kloudspeaker.ui.process($target, process, handler);
            if (typeof handler === 'function') handler();
            else if (handler.onLoad) handler.onLoad($target);
            df.resolve();
        });
        return df;
    };

    md.template = function(id, data, opt) {
        var templateId = id;
        if (templateId.startsWith("#")) templateId = templateId.substring(1);
        if (kloudspeaker.settings["resource-map"] && kloudspeaker.settings["resource-map"]["template:" + id])
            templateId = kloudspeaker.settings["resource-map"]["template:" + id];
        return $("#" + templateId).tmpl(data, opt);
    };

    md.bind = function(model, activationData, $e) {
        if (!$e || $e.length === 0) return;
        if (model.activate) model.activate(activationData);
        ko.applyBindings(model, $e[0]);
        kloudspeaker.ui.process($e, ['localize']);
        if (model.attached) model.attached($e);
    };

    return md;
});
