define([],
    function() {
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

                input = window.Base64._utf8_encode(input);

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

                output = window.Base64._utf8_decode(output);

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
        }

        var utils = {
            Base64: Base64,
            createObj: function neu(constructor, args) {
                // http://www.ecma-international.org/ecma-262/5.1/#sec-13.2.2
                var instance = Object.create(constructor.prototype);
                var result = constructor.apply(instance, args);

                // The ECMAScript language types are Undefined, Null, Boolean, String, Number, and Object.
                return (result !== null && typeof result === 'object') ? result : instance;
            },

            deferreds: function(m) {
                var master = $.Deferred();
                var res = {
                    success: {},
                    fail: {}
                };
                var all = kloudspeaker.utils.getKeys(m);
                var count = all.length;
                $.each(all, function(i, dk) {
                    var df = m[dk];
                    df.done(function(r) {
                        res.success[dk] = r;
                        count--;
                        if (count === 0) master.resolve(res);
                    }).fail(function(r) {
                        res.fail[dk] = r;
                        count--;
                        if (count === 0) master.resolve(res);
                    });
                });
                return master.promise();
            },

            breakUrl: function(u) {
                var parts = u.split("?");
                return {
                    path: parts[0],
                    params: kloudspeaker.helpers.getUrlParams(u),
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
                return kloudspeaker.utils.urlWithParam(url, "_=" + kloudspeaker._time);
            },

            formatDateTime: function(time, fmt) {
                var ft = time.toString(fmt);
                return ft;
            },

            parseInternalTime: function(time) {
                if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;

                var ts = new Date();
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
                return kloudspeaker.utils.formatDateTime(time, 'yyyyMMddHHmmss');
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
            }
        };
        return utils;
    });
