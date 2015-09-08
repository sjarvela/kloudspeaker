define(['kloudspeaker/plugins', 'kloudspeaker/session', 'kloudspeaker/service', 'kloudspeaker/utils', 'kloudspeaker/localization', 'kloudspeaker/templates', 'kloudspeaker/dom', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/dialogs', 'kloudspeaker/ui/views', 'kloudspeaker/ui/config/listview', 'knockout'], function(plugins, session, service, utils, loc, templates, dom, formatters, dialogs, views, ConfigListView, ko) {
    return function() {
        var that = this;
        that._timestampFormatter = new formatters.Timestamp(loc.get('shortDateTimeFormat'));

        this.init = function($c) {
            var list = false;
            var listView = false;
            var s = session.get();

            var updateList = function() {
                that._cv.showLoading(true);
                service.get("registration/list/").done(function(l) {
                    list = l;
                    listView.table.set(list);
                    that._cv.showLoading(false);
                });
            };

            listView = new ConfigListView($c, {
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
                        service.del("registration/list/", {
                            ids: utils.extractValue(sel, "id")
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
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('pluginRegistrationAdminNameTitle')
                    }, {
                        id: "email",
                        title: loc.get('pluginRegistrationAdminEmailTitle')
                    }, {
                        id: "key",
                        title: loc.get('pluginRegistrationAdminKeyTitle')
                    }, {
                        id: "time",
                        title: loc.get('pluginRegistrationAdminTimeTitle'),
                        formatter: that._timestampFormatter
                    }, {
                        id: "confirmed",
                        title: loc.get('pluginRegistrationAdminConfirmedTitle'),
                        formatter: that._timestampFormatter
                    }, {
                        id: "approve",
                        title: loc.get('pluginRegistrationAdminApproveTitle'),
                        type: "action",
                        content: '<i class="fa fa-thumbs-up"></i>',
                        enabled: function(r) {
                            return s.plugins.Registration.require_approval && r.confirmed;
                        }
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRow: function($r, r) {
                        if (r.confirmed) $r.addClass("success");
                        else $r.addClass("warning");
                    },
                    onRowAction: function(id, r) {
                        if (id == "remove") {
                            service.del("registration/list/" + r.id).done(updateList);
                        } else if (id == "approve") {
                            service.post("registration/approve/" + r.id).done(updateList);
                        }
                    }
                }
            });
            updateList();
        };

        this.onAddRegistration = function(cb) {
            templates.load("plugin-registration-content", utils.noncachedUrl(plugins.adminUrl("Registration", "content.html"))).done(function() {
                var $content = false;
                var $name = false;
                var $email = false;
                var $password = false;

                dialogs.custom({
                    resizable: true,
                    initSize: [600, 400],
                    title: loc.get('pluginRegistrationAdminAddRegistrationTitle'),
                    content: dom.template("kloudspeaker-tmpl-registration-add"),
                    buttons: [{
                        id: "yes",
                        "title": loc.get('dialogSave')
                    }, {
                        id: "no",
                        "title": loc.get('dialogCancel')
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

                        service.post("registration/create", {
                            name: username,
                            password: utils.Base64.encode(password),
                            email: email
                        }).done(d.close).done(cb).fail(function(er) {
                            if (er.code == 301) {
                                this.handled = true;
                                dialogs.error({
                                    message: loc.get('registrationFailedDuplicateNameOrEmail')
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

        return {
            attached: function($t, $c) {
                that._cv = views.getActiveConfigView();
                that.init($c);
            },
            onDeactivate: function() {}
        };
    };
});
