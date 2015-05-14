define(['kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/ui/texts', 'knockout'], function(settings, session, texts, ko) {
    var model = {
        versionCheck: !!settings["version-check-url"],
        version: ko.observable(''),
        revision: ko.observable(''),
        alertType: ko.observable(null),
        msg: ko.observable(''),
    };
    return {
        model: model,

        checkVersion: function() {
            if (!settings["version-check-url"]) return;

            model.alertType(null);
            $.ajax({
                type: 'get',
                jsonp: "callback",
                dataType: "jsonp",
                url: settings["version-check-url"]
            }).done(function(v) {
                if (session.get().version != v.version) {
                    model.msg(texts.get("configSystemVersionCheckUpgradeAvailable", [v["version"], v["date"], v["url"]]));
                    model.alertType('info');
                } else {
                    model.msg(texts.get("configSystemVersionCheckLatest"));
                    model.alertType('success');
                }
            }).fail(function() {
                model.msg(texts.get("configSystemVersionCheckFailed"));
                model.alert('error');
            });
        },

        onActivate: function() {
            model.alertType(null);
            model.msg('');

            var s = session.get();
            model.version(s.version);
            model.revision(s.revision);
        }
    };
});
