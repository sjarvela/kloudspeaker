define([], function() {
    //TODO remove global references

    var _time = new Date().getTime();
    var utils = {
        generatePassword: function(l) {
            var length = l || 8;
            var password = '';
            var c;

            for (var i = 0; i < length; i++) {
                while (true) {
                    c = (parseInt(Math.random() * 1000, 10) % 94) + 33;
                    if (utils.isValidPasswordChar(c)) break;
                }
                password += String.fromCharCode(c);
            }
            return password;
        },

        isValidPasswordChar: function(c) {
            if (c >= 33 && c <= 47) return false;
            if (c >= 58 && c <= 64) return false;
            if (c >= 91 && c <= 96) return false;
            if (c >= 123 && c <= 126) return false;
            return true;
        },

        getPluginActions: function(plugins) {
            var list = [];

            if (plugins) {
                for (var id in plugins) {
                    var p = plugins[id];
                    if (p.actions) {
                        list.push({
                            title: "-",
                            type: 'separator'
                        });
                        $.merge(list, p.actions);
                    }
                }
            }
            var downloadActions = [];
            var firstDownload = -1;
            for (var i = 0, j = list.length; i < j; i++) {
                var a = list[i];
                if (a.group == 'download') {
                    if (firstDownload < 0) firstDownload = i;
                    downloadActions.push(a);
                }
            }
            if (downloadActions.length > 1) {
                for (var i2 = 1, j2 = downloadActions.length; i2 < j2; i2++) list.remove(downloadActions[i2]);
                list[firstDownload] = {
                    type: "submenu",
                    items: downloadActions,
                    title: downloadActions[0].title,
                    group: downloadActions[0].group,
                    primary: downloadActions[0]
                };
            }
            return list;
        },

        getPrimaryActions: function(actions) {
            if (!actions) return [];
            var result = [];
            var p = function(list) {
                for (var i = 0, j = list.length; i < j; i++) {
                    var a = list[i];
                    if (a.type == 'primary' || a.group == 'download') result.push(a);
                }
            }
            p(actions);
            return result;
        },

        getSecondaryActions: function(actions) {
            if (!actions) return [];
            var result = [];
            for (var i = 0, j = actions.length; i < j; i++) {
                var a = actions[i];
                if (a.id == 'download' || a.type == 'primary') continue;
                result.push(a);
            }
            return utils.cleanupActions(result);
        },

        cleanupActions: function(actions) {
            if (!actions) return [];
            var last = -1;
            for (var i = actions.length - 1, j = 0; i >= j; i--) {
                var a = actions[i];
                if (a.type != 'separator' && a.title != '-') {
                    last = i;
                    break;
                }
            }
            if (last < 0) return [];

            var first = -1;
            for (var i2 = 0; i2 <= last; i2++) {
                var a2 = actions[i2];
                if (a2.type != 'separator' && a2.title != '-') {
                    first = i2;
                    break;
                }
            }
            actions = actions.splice(first, (last - first) + 1);
            var prevSeparator = false;
            for (var i3 = actions.length - 1, j2 = 0; i3 >= j2; i3--) {
                var a3 = actions[i3];
                var separator = (a3.type == 'separator' || a3.title == '-');
                if (separator && prevSeparator) actions.splice(i3, 1);
                prevSeparator = separator;
            }

            return actions;
        },

        breakUrl: function(u) {
            var parts = u.split("?");
            return {
                path: parts[0],
                params: utils.getUrlParams(u),
                paramsString: (parts.length > 1 ? ("?" + parts[1]) : "")
            };
        },

        getUrlParams: function(u) {
            var params = {};
            $.each(u.substring(1).split("&"), function(i, p) {
                var pp = p.split("=");
                if (!pp || pp.length < 2) return;
                params[decodeURIComponent(pp[0])] = decodeURIComponent(pp[1]);
            });
            return params;
        },

        urlWithParam: function(url, param, v) {
            var p = param;
            if (v) p = param + "=" + encodeURIComponent(v);
            return url + (window.strpos(url, "?") ? "&" : "?") + p;
        },

        noncachedUrl: function(url) {
            return utils.urlWithParam(url, "_=" + _time);
        },

        hasPermission: function(list, name, required) {
            if (!list || list[name] === undefined) return false;
            if (kloudspeaker.session.user.admin) return true;

            var v = list[name];

            var options = kloudspeaker.session.data.permission_types.values[name];
            if (!required || !options) return (v == "1");

            var ui = options.indexOf(v);
            var ri = options.indexOf(required);
            return (ui >= ri);
        },

        formatDateTime: function(time, fmt) {
            var ft = time.toString(fmt);
            return ft;
        },

        parseInternalTime: function(time) {
            if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;

            var ts = new Date();
            /*ts.setUTCFullYear(time.substring(0,4));
            ts.setUTCMonth(time.substring(4,6) - 1);
            ts.setUTCDate(time.substring(6,8));
            ts.setUTCHours(time.substring(8,10));
            ts.setUTCMinutes(time.substring(10,12));
            ts.setUTCSeconds(time.substring(12,14));*/
            ts.setYear(time.substring(0, 4));
            ts.setMonth(time.substring(4, 6) - 1);
            ts.setDate(time.substring(6, 8));
            ts.setHours(time.substring(8, 10));
            ts.setMinutes(time.substring(10, 12));
            ts.setSeconds(time.substring(12, 14));
            return ts;
        },

        formatInternalTime: function(time) {
            if (!time) return null;

            /*var year = pad(""+time.getUTCFullYear(), 4, '0', STR_PAD_LEFT);
            var month = pad(""+(time.getUTCMonth() + 1), 2, '0', STR_PAD_LEFT);
            var day = pad(""+time.getUTCDate(), 2, '0', STR_PAD_LEFT);
            var hour = pad(""+time.getUTCHours(), 2, '0', STR_PAD_LEFT);
            var min = pad(""+time.getUTCMinutes(), 2, '0', STR_PAD_LEFT);
            var sec = pad(""+time.getUTCSeconds(), 2, '0', STR_PAD_LEFT);
            return year + month + day + hour + min + sec;*/
            //var timeUTC = new Date(Date.UTC(time.getYear(), time.getMonth(), time.getDay(), time.getHours(), time.getMinutes(), time.getSeconds()));
            return utils.formatDateTime(time, 'yyyyMMddHHmmss');
        },

        mapByKey: function(list, key, value) {
            var byKey = {};
            if (!list) return byKey;
            for (var i = 0, j = list.length; i < j; i++) {
                var r = list[i];
                if (!window.def(r)) continue;
                var v = r[key];
                if (!window.def(v)) continue;

                if (window.def(value) && r[value])
                    byKey[v] = r[value];
                else
                    byKey[v] = r;
            }
            return byKey;
        },

        getKeys: function(m) {
            var list = [];
            if (m)
                for (var k in m) {
                    if (!m.hasOwnProperty(k)) continue;
                    list.push(k);
                }
            return list;
        },

        extractValue: function(list, key) {
            var l = [];
            for (var i = 0, j = list.length; i < j; i++) {
                var r = list[i];
                l.push(r[key]);
            }
            return l;
        },

        filter: function(list, f) {
            var result = [];
            $.each(list, function(i, it) {
                if (f(it)) result.push(it);
            });
            return result;
        },

        arrayize: function(i) {
            var a = [];
            if (!window.isArray(i)) {
                a.push(i);
            } else {
                return i;
            }
            return a;
        },

        createNotifier: function() {
            return function() {
                var listeners = [];
                return {
                    trigger: function() {
                        _.each(listeners, function(l) {
                            l();
                        });
                    },
                    listen: function(cb) {
                        listeners.push(cb);
                    }
                }
            }();
        },

        invokeLater: function(f, to) {
            setTimeout(f, to || 0);
        },

        base64 : window.Base64
    };
    return utils;
});
