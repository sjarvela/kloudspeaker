define(['kloudspeaker/session', 'kloudspeaker/utils', 'kloudspeaker/ui', 'kloudspeaker/dom', 'kloudspeaker/ui/views'], function(session, utils, ui, dom, views) {
    return function() {
        return {
            attached: function($t, $c) {
                var s = session.get();
                var mv = views.getActiveMainView();	//TODO changePassword action?

                dom.template("kloudspeaker-tmpl-config-useraccountview", s).appendTo($c);
                ui.process($c, ["localize"]);
                $("#user-account-change-password-btn").click(mv.changePassword);
            }
        };
    };
});
