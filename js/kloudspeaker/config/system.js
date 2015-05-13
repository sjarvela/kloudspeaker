define(['kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/ui/texts', 'ko'], function(settings, session, texts, ko) {
    var that = this;
    var versionCheckUrl = settings["version-check-url"];

    /*kloudspeaker.dom.template("kloudspeaker-tmpl-config-systemview", {
        session: kloudspeaker.session,
        versionCheck: !!versionCheckUrl
    }).appendTo($c);
    kloudspeaker.ui.process($c, ["localize"]);*/

    /*if (!!versionCheckUrl)
        $("#system-check-new-version-btn").click(function() {
            $("#version-check-result").removeClass("alert-error alert-info alert-success").hide();

            $.ajax({
                type: 'get',
                jsonp: "callback",
                dataType: "jsonp",
                url: kloudspeaker.settings["version-check-url"]
            }).done(function(v) {
                if (kloudspeaker.session.version != v.version) {
                    $("#version-check-result").addClass("alert-info").html(kloudspeaker.ui.texts.get("configSystemVersionCheckUpgradeAvailable", [v["version"], v["date"], v["url"]])).show();
                } else {
                    $("#version-check-result").addClass("alert-success").html(kloudspeaker.ui.texts.get("configSystemVersionCheckLatest")).show();
                }
            }).fail(function() {
                $("#version-check-result").addClass("alert-error").html(kloudspeaker.ui.texts.get("configSystemVersionCheckFailed")).show();
            });
        });
    //});*/
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
            var s = session.get();
            model.version(s.version);
            model.revision(s.revision);
        }
    };
});
