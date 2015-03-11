/**
 * loginview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {

    "use strict";

    mollify.view.LoginView = function() {
        var that = this;

        that.init = function($c) {
            return mollify.dom.loadContentInto($c, mollify.templates.url("loginview.html"), that, ['localize', 'bubble']);
        }

        that.onLoad = function() {
            if (mollify.features.hasFeature('lost_password')) {
                $("#mollify-login-forgot-password").show();
            }
            if (mollify.features.hasFeature('registration') && mollify.plugins.exists("plugin-registration")) {
                $("#mollify-login-register").click(function() {
                    mollify.plugins.get("plugin-registration").show();
                }).show();
            }

            $("#mollify-login-name, #mollify-login-password").bind('keypress', function(e) {
                if ((e.keyCode || e.which) == 13) that.onLogin();
            });
            $("#mollify-login-button").click(that.onLogin);
            $("#mollify-login-name").focus();
        }

        that.onRenderBubble = function(id, bubble) {}

        that.onShowBubble = function(id, bubble) {
            if (id === 'mollify-login-forgot-password') {
                $("#mollify-login-forgot-button").click(function() {
                    var email = $("#mollify-login-forgot-email").val();
                    if (!email) return;

                    bubble.hide();
                    that.wait = mollify.ui.dialogs.wait({
                        target: "mollify-login-main"
                    });
                    that.onResetPassword(email);
                });
                if (mollify.session.plugins.LostPassword && mollify.session.plugins.LostPassword.enable_hint)
                    $("#mollify-login-forgot-button-hint").click(function() {
                        var email = $("#mollify-login-forgot-email").val();
                        if (!email) return;

                        bubble.hide();
                        that.wait = mollify.ui.dialogs.wait({
                            target: "mollify-login-main"
                        });
                        that.onResetPassword(email, true);
                    }).show();

                $("#mollify-login-forgot-email").val("").focus();
            }
        }

        that.onLogin = function() {
            var username = $("#mollify-login-name").val();
            var password = $("#mollify-login-password").val();
            var remember = $("#mollify-login-remember-cb").is(':checked');

            if (!username || username.length < 1) {
                $("#mollify-login-name").focus();
                return;
            }
            if (!password || password.length < 1) {
                $("#mollify-login-password").focus();
                return;
            }
            that.wait = mollify.ui.dialogs.wait({
                target: "mollify-login-main"
            });
            mollify.service.post("session/authenticate/", {
                username: username,
                password: window.Base64.encode(password),
                remember: remember
            }).done(function(s) {
                mollify.events.dispatch('session/start', s);
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

            mollify.service.post("lostpassword", data).done(function(r) {
                that.wait.close();

                mollify.ui.dialogs.notification({
                    message: mollify.ui.texts.get(hint ? 'resetPasswordPopupSendHintSuccess' : 'resetPasswordPopupResetSuccess')
                });
            }).fail(function(e) {
                this.handled = true;
                that.wait.close();

                mollify.ui.dialogs.info({
                    message: mollify.ui.texts.get(hint ? 'resetPasswordPopupSendHintFailed' : 'resetPasswordPopupResetFailed')
                });
            });
        }

        that.showLoginError = function() {
            that.wait.close();

            mollify.ui.dialogs.notification({
                message: mollify.ui.texts.get('loginDialogLoginFailedMessage')
            });
        }
    };
}(window.jQuery, window.mollify);
