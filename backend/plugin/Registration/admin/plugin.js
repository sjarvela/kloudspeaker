/**
 * plugin.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict"; // jshint ;_;

    kloudspeaker.view.config.admin.Registration = {
        RegistrationsView: function() {
            var that = this;

            // props
            this.requiresPermission = "manage_user_registrations";
            this.viewId = "registration";

            this.init = function(s, cv) {
                that._cv = cv;
                that.title = kloudspeaker.ui.texts.get("pluginRegistrationAdminNavTitle");
                that._timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));
            }

            this.onActivate = function($c) {
                var list = false;
                var listView = false;

                var updateList = function() {
                    that._cv.showLoading(true);
                    kloudspeaker.service.get("registration/list/").done(function(l) {
                        list = l;
                        listView.table.set(list);
                        that._cv.showLoading(false);
                    });
                };

                listView = new kloudspeaker.view.ConfigListView($c, {
                    actions: [{
                        id: "action-add",
                        content: '<i class="fa fa-plus"></i>',
                        callback: function() {
                            that.onAddRegistration(updateList);
                        }
                    }, {
                        id: "action-remove",
                        content: '<i class="fa fa-trash"></i>',
                        cls: "btn-danger",
                        depends: "table-selection",
                        callback: function(sel) {
                            kloudspeaker.service.del("registration/list/", {
                                ids: kloudspeaker.helpers.extractValue(sel, "id")
                            }).done(updateList);
                        }
                    }, {
                        id: "action-refresh",
                        content: '<i class="fa fa-refresh"></i>',
                        callback: updateList
                    }],
                    table: {
                        id: "config-admin-registrations",
                        key: "id",
                        narrow: true,
                        columns: [{
                            type: "selectrow"
                        }, {
                            id: "icon",
                            title: "",
                            valueMapper: function(r) {
                                return (r.confirmed) ? '<i class="fa fa-check"></i>' : '<i class="fa fa-pencil"></i>';
                            }
                        }, {
                            id: "id",
                            title: kloudspeaker.ui.texts.get('configAdminTableIdTitle')
                        }, {
                            id: "name",
                            title: kloudspeaker.ui.texts.get('pluginRegistrationAdminNameTitle')
                        }, {
                            id: "email",
                            title: kloudspeaker.ui.texts.get('pluginRegistrationAdminEmailTitle')
                        }, {
                            id: "key",
                            title: kloudspeaker.ui.texts.get('pluginRegistrationAdminKeyTitle')
                        }, {
                            id: "time",
                            title: kloudspeaker.ui.texts.get('pluginRegistrationAdminTimeTitle'),
                            formatter: that._timestampFormatter
                        }, {
                            id: "confirmed",
                            title: kloudspeaker.ui.texts.get('pluginRegistrationAdminConfirmedTitle'),
                            formatter: that._timestampFormatter
                        }, {
                            id: "approve",
                            title: kloudspeaker.ui.texts.get('pluginRegistrationAdminApproveTitle'),
                            type: "action",
                            content: '<i class="fa fa-thumbs-up"></i>',
                            enabled: function(r) {
                                return kloudspeaker.session.plugins.Registration.require_approval && r.confirmed;
                            }
                        }, {
                            id: "remove",
                            title: kloudspeaker.ui.texts.get('configAdminActionRemoveTitle'),
                            type: "action",
                            content: '<i class="fa fa-trash"></i>'
                        }],
                        onRow: function($r, r) {
                            if (r.confirmed) $r.addClass("success");
                            else $r.addClass("warning");
                        },
                        onRowAction: function(id, r) {
                            if (id == "remove") {
                                kloudspeaker.service.del("registration/list/" + r.id).done(updateList);
                            } else if (id == "approve") {
                                kloudspeaker.service.post("registration/approve/" + r.id).done(updateList);
                            }
                        }
                    }
                });
                updateList();
            };

            this.onAddRegistration = function(cb) {
                kloudspeaker.templates.load("plugin-registration-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.adminUrl("Registration", "content.html"))).done(function() {
                    var $content = false;
                    var $name = false;
                    var $email = false;
                    var $password = false;

                    kloudspeaker.ui.dialogs.custom({
                        resizable: true,
                        initSize: [600, 400],
                        title: kloudspeaker.ui.texts.get('pluginRegistrationAdminAddRegistrationTitle'),
                        content: kloudspeaker.dom.template("kloudspeaker-tmpl-registration-add"),
                        buttons: [{
                            id: "yes",
                            "title": kloudspeaker.ui.texts.get('dialogSave')
                        }, {
                            id: "no",
                            "title": kloudspeaker.ui.texts.get('dialogCancel')
                        }],
                        "on-button": function(btn, d) {
                            if (btn.id == 'no') {
                                d.close();
                                return;
                            }

                            var username = $name.val();
                            var email = $email.val();
                            var password = $password.val();
                            if (!username || username.length === 0 || !password || password.length === 0) return;

                            kloudspeaker.service.post("registration/create", {
                                name: username,
                                password: kloudspeaker.helpers.Base64.encode(password),
                                email: email
                            }).done(d.close).done(cb).fail(function(er) {
                                if (er.code == 301) {
                                    this.handled = true;
                                    kloudspeaker.ui.dialogs.error({
                                        message: kloudspeaker.ui.texts.get('registrationFailedDuplicateNameOrEmail')
                                    });
                                }
                            });
                        },
                        "on-show": function(h, $d) {
                            $content = $d.find("#kloudspeaker-registration-add-dialog");
                            $name = $d.find("#usernameField");
                            $email = $d.find("#emailField");
                            $password = $d.find("#passwordField");
                            $("#generatePasswordBtn").click(function() {
                                $password.val(that._generatePassword());
                                return false;
                            });

                            $name.focus();
                            h.center();
                        }
                    });
                });
            }

            this._generatePassword = function() {
                var length = 8;
                var password = '';
                var c;

                for (var i = 0; i < length; i++) {
                    while (true) {
                        c = (parseInt(Math.random() * 1000, 10) % 94) + 33;
                        if (that._isValidPasswordChar(c)) break;
                    }
                    password += String.fromCharCode(c);
                }
                return password;
            }

            this._isValidPasswordChar = function(c) {
                if (c >= 33 && c <= 47) return false;
                if (c >= 58 && c <= 64) return false;
                if (c >= 91 && c <= 96) return false;
                if (c >= 123 && c <= 126) return false;
                return true;
            }
        }
    }

    kloudspeaker.admin.plugins.Registration = {
        resources: {
            texts: false
        },
        views: [
            new kloudspeaker.view.config.admin.Registration.RegistrationsView()
        ]
    };
}(window.jQuery, window.kloudspeaker);
