/**
 * loginview.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict";

    kloudspeaker.view.LoginView = function() {
        var that = this;

        that.init = function($c) {
            return kloudspeaker.dom.loadContentInto($c, kloudspeaker.templates.url("loginview.html"), that, ['localize', 'bubble']);
        }

        that.onLoad = function() {
            if (kloudspeaker.features.hasFeature('lost_password')) {
                $("#kloudspeaker-login-forgot-password").show();
            }
            if (kloudspeaker.features.hasFeature('registration') && kloudspeaker.plugins.exists("plugin-registration")) {
                $("#kloudspeaker-login-register").click(function() {
                    kloudspeaker.plugins.get("plugin-registration").openRegistration();
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
                    that.wait = kloudspeaker.ui.dialogs.wait({
                        target: "kloudspeaker-login-main"
                    });
                    that.onResetPassword(email);
                });
                if (kloudspeaker.session.plugins.LostPassword && kloudspeaker.session.plugins.LostPassword.enable_hint)
                    $("#kloudspeaker-login-forgot-button-hint").click(function() {
                        var email = $("#kloudspeaker-login-forgot-email").val();
                        if (!email) return;

                        bubble.hide();
                        that.wait = kloudspeaker.ui.dialogs.wait({
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
            that.wait = kloudspeaker.ui.dialogs.wait({
                target: "kloudspeaker-login-main"
            });
            kloudspeaker.service.post("session/authenticate/", {
                username: username,
                password: window.Base64.encode(password),
                remember: remember
            }).done(function(s) {
                kloudspeaker.events.dispatch('session/start', s);
            }).fail(function(e) {
                if (e.code == 107) this.handled = true;
                that.showLoginError();
            });
        }

        that.onResetPassword = function(email, hint) {
            var data = {
                "email": email
            };
            if (hint) data.hint = true;

            kloudspeaker.service.post("lostpassword", data).done(function(r) {
                that.wait.close();

                kloudspeaker.ui.dialogs.notification({
                    message: kloudspeaker.ui.texts.get(hint ? 'resetPasswordPopupSendHintSuccess' : 'resetPasswordPopupResetSuccess')
                });
            }).fail(function(e) {
                this.handled = true;
                that.wait.close();

                kloudspeaker.ui.dialogs.info({
                    message: kloudspeaker.ui.texts.get(hint ? 'resetPasswordPopupSendHintFailed' : 'resetPasswordPopupResetFailed')
                });
            });
        }

        that.showLoginError = function() {
            that.wait.close();

            kloudspeaker.ui.dialogs.notification({
                message: kloudspeaker.ui.texts.get('loginDialogLoginFailedMessage')
            });
        }
    };
}(window.jQuery, window.kloudspeaker);
