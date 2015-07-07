define(['kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/localization', 'kloudspeaker/features', 'kloudspeaker/plugins', 'kloudspeaker/ui/dialogs', 'kloudspeaker/dom', 'kloudspeaker/templates'], function(settings, session, service, loc, features, plugins, dialogs, dom, templates) {
    return function() {
        var that = this;

        that.init = function($c) {
            return dom.loadContentInto($c, templates.url("loginview.html"), that, ['localize', 'bubble']);
        }

        that.onLoad = function() {
            if (features.hasFeature('lost_password')) {
                $("#kloudspeaker-login-forgot-password").show();
            }
            if (features.hasFeature('registration') && plugins.exists("plugin-registration")) {
                $("#kloudspeaker-login-register").click(function() {
                    plugins.get("plugin-registration").openRegistration();
                }).show();
            }

            $("#kloudspeaker-login-name, #kloudspeaker-login-password").bind('keypress', function(e) {
                if ((e.keyCode || e.which) == 13) that.onLogin();
            });
            $("#kloudspeaker-login-button").click(that.onLogin);
            $("#kloudspeaker-login-name").focus();
        }

        that.onRenderBubble = function(id, bubble) {}

        that.onShowBubble = function(id, bubble) {
            if (id === 'kloudspeaker-login-forgot-password') {
                $("#kloudspeaker-login-forgot-button").click(function() {
                    var email = $("#kloudspeaker-login-forgot-email").val();
                    if (!email) return;

                    bubble.hide();
                    that.wait = dialogs.wait({
                        target: "kloudspeaker-login-main"
                    });
                    that.onResetPassword(email);
                });
                var s = session.get();
                if (s.plugins.LostPassword && s.plugins.LostPassword.enable_hint)
                    $("#kloudspeaker-login-forgot-button-hint").click(function() {
                        var email = $("#kloudspeaker-login-forgot-email").val();
                        if (!email) return;

                        bubble.hide();
                        that.wait = dialogs.wait({
                            target: "kloudspeaker-login-main"
                        });
                        that.onResetPassword(email, true);
                    }).show();

                $("#kloudspeaker-login-forgot-email").val("").focus();
            }
        }

        that.onLogin = function() {
            var username = $("#kloudspeaker-login-name").val();
            var password = $("#kloudspeaker-login-password").val();
            var remember = $("#kloudspeaker-login-remember-cb").is(':checked');

            if (!username || username.length < 1) {
                $("#kloudspeaker-login-name").focus();
                return;
            }
            if (!password || password.length < 1) {
                $("#kloudspeaker-login-password").focus();
                return;
            }
            that.wait = dialogs.wait({
                target: "kloudspeaker-login-main"
            });
            session.authenticate(username, password, remember).fail(function(e) {
                if (e.code == 107) this.handled = true;
                that.showLoginError();
            });
        }

        that.onResetPassword = function(email, hint) {
            var data = {
                "email": email
            };
            if (hint) data.hint = true;

            service.post("lostpassword", data).done(function(r) {
                that.wait.close();

                dialogs.notification({
                    message: loc.get(hint ? 'resetPasswordPopupSendHintSuccess' : 'resetPasswordPopupResetSuccess')
                });
            }).fail(function(e) {
                this.handled = true;
                that.wait.close();

                dialogs.info({
                    message: loc.get(hint ? 'resetPasswordPopupSendHintFailed' : 'resetPasswordPopupResetFailed')
                });
            });
        }

        that.showLoginError = function() {
            that.wait.close();

            dialogs.notification({
                message: loc.get('loginDialogLoginFailedMessage')
            });
        }
    };
});
