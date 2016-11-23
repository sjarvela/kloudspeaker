define([], function() {
    var _time = new Date().getTime();

    /**
     *
     *  Base64 encode / decode
     *  http://www.webtoolkit.info/
     *
     **/
    var Base64 = {

        // private property
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

        // public method for encoding
        encode: function(input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;

            input = Base64._utf8_encode(input);

            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
            }

            return output;
        },

        // public method for decoding
        decode: function(input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            while (i < input.length) {
                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }

            output = Base64._utf8_decode(output);

            return output;
        },

        // private method for UTF-8 encoding
        _utf8_encode: function(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        },

        // private method for UTF-8 decoding
        _utf8_decode: function(utftext) {
            var string = "";
            var i = 0;
            var c = 0,
                c1 = 0,
                c2 = 0;

            while (i < utftext.length) {

                c = utftext.charCodeAt(i);

                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    var c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

            }

            return string;
        }
    };

    var utils = {
        isDefined: function(o) {
            return (typeof(o) != 'undefined');
        },

        isArray: function(o) {
            return Object.prototype.toString.call(o) === '[object Array]';
        },

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
            var url = u;
            var p = url.lastIndexOf('?');
            if (p >= 0) url = url.substring(p+1);

            var params = {};
            $.each(url.split("&"), function(i, p) {
                var pp = p.split("=");
                if (!pp || pp.length < 2) return;
                params[decodeURIComponent(pp[0])] = decodeURIComponent(pp[1]);
            });
            return params;
        },

        urlWithParam: function(url, param, v) {
            var p = param;
            if (v) p = param + "=" + encodeURIComponent(v);
            return url + (utils.strpos(url, "?") ? "&" : "?") + p;
        },

        noncachedUrl: function(url) {
            return utils.urlWithParam(url, "_=" + _time);
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
                if (!utils.isDefined(r)) continue;
                var v = r[key];
                if (!utils.isDefined(v)) continue;

                if (utils.isDefined(value) && r[value])
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
            if (!utils.isArray(i)) {
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

        all: function(list) {
            var df = $.Deferred();
            if (!list || list.length === 0) return df.resolve();
            
            $.when.apply($, list).done(function() { df.resolve(); });
            return df;
        },

        Base64: Base64,

        strpos: function(haystack, needle, offset) {
            // Finds position of first occurrence of a string within another  
            // 
            // version: 1109.2015
            // discuss at: http://phpjs.org/functions/strpos
            // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // +   improved by: Onno Marsman    
            // +   bugfixed by: Daniel Esteban
            // +   improved by: Brett Zamir (http://brett-zamir.me)
            var i = (haystack + '').indexOf(needle, (offset || 0));
            return i === -1 ? false : i;
        },

        //TODO is this needed
        strpad: function(str, len, padstr, dir) {
            var STR_PAD_LEFT = 1;
            var STR_PAD_RIGHT = 2;
            var STR_PAD_BOTH = 3;

            if (typeof(len) == "undefined") {
                len = 0;
            }
            if (typeof(padstr) == "undefined") {
                padstr = ' ';
            }
            if (typeof(dir) == "undefined") {
                dir = STR_PAD_RIGHT;
            }

            if (len + 1 >= str.length) {
                switch (dir) {
                    case STR_PAD_LEFT:
                        str = new Array(len + 1 - str.length).join(padstr) + str;
                        break;
                    case STR_PAD_BOTH:
                        var padlen = len - str.length;
                        var right = Math.ceil(padlen / 2);
                        var left = padlen - right;
                        str = new Array(left + 1).join(padstr) + str + new Array(right + 1).join(padstr);
                        break;
                    default:
                        str = str + new Array(len + 1 - str.length).join(padstr);
                        break;
                }
            }
            return str;
        }
    };
    return utils;
});
