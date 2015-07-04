define([], function() {
    //TODO remove global references
    var formatters = {
        ByteSize: function(nf) {
            this.format = function(b) {
                if (!window.def(b)) return "";

                var bytes = b;
                if (typeof(b) === "string") {
                    bytes = parseInt(bytes, 10);
                    if (isNaN(bytes)) return "";
                } else if (typeof(b) !== "number") return "";

                if (bytes < 1024)
                    return (bytes == 1 ? kloudspeaker.ui.texts.get('sizeOneByte') : kloudspeaker.ui.texts.get('sizeInBytes', nf.format(bytes)));

                if (bytes < (1024 * 1024)) {
                    var kilobytes = bytes / 1024;
                    return (kilobytes == 1 ? kloudspeaker.ui.texts.get('sizeOneKilobyte') : kloudspeaker.ui.texts.get('sizeInKilobytes', nf.format(kilobytes)));
                }

                if (bytes < (1024 * 1024 * 1024)) {
                    var megabytes = bytes / (1024 * 1024);
                    return kloudspeaker.ui.texts.get('sizeInMegabytes', nf.format(megabytes));
                }

                var gigabytes = bytes / (1024 * 1024 * 1024);
                return kloudspeaker.ui.texts.get('sizeInGigabytes', nf.format(gigabytes));
            };
        },
        Timestamp: function(fmt) {
            this.format = function(ts) {
                if (ts == null) return "";
                if (typeof(ts) === 'string') ts = kloudspeaker.helpers.parseInternalTime(ts);
                return ts.toString(fmt);
            };
        },
        Number: function(precision, unit, ds) {
            this.format = function(n) {
                if (!window.def(n) || typeof(n) !== 'number') return "";

                var s = Math.pow(10, precision);
                var v = Math.floor(n * s) / s;
                var sv = v.toString();
                if (ds) sv = sv.replace(".", ds);
                if (unit) return sv + " " + unit;
                return sv;
            };
        },
        FilesystemItemPath: function(noHtml) {
            this.format = function(item) {
                if (!item) return "";
                return (kloudspeaker.filesystem.rootsById[item.root_id] ? kloudspeaker.filesystem.rootsById[item.root_id].name : item.root_id) + (item.path.length > 0 ? (":" + (noHtml ? ' ' : '&nbsp;') + item.path) : "");
            }
        }
    };
    return formatters;
});
