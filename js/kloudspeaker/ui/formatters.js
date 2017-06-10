define(['kloudspeaker/localization', 'kloudspeaker/utils', 'kloudspeaker/filesystem'], function(loc, utils, fs) {
    var predefined = {};
    var formatters = {
        ByteSize: function(nf) {
            this.format = function(b) {
                if (!utils.isDefined(b)) return "";

                var bytes = b;
                if (typeof(b) === "string") {
                    bytes = parseInt(bytes, 10);
                    if (isNaN(bytes)) return "";
                } else if (typeof(b) !== "number") return "";

                if (bytes < 1024)
                    return (bytes == 1 ? loc.get('sizeOneByte') : loc.get('sizeInBytes', nf.format(bytes)));

                if (bytes < (1024 * 1024)) {
                    var kilobytes = bytes / 1024;
                    return (kilobytes == 1 ? loc.get('sizeOneKilobyte') : loc.get('sizeInKilobytes', nf.format(kilobytes)));
                }

                if (bytes < (1024 * 1024 * 1024)) {
                    var megabytes = bytes / (1024 * 1024);
                    return loc.get('sizeInMegabytes', nf.format(megabytes));
                }

                var gigabytes = bytes / (1024 * 1024 * 1024);
                return loc.get('sizeInGigabytes', nf.format(gigabytes));
            };
        },
        Timestamp: function(fmt) {
            this.format = function(ts) {
                if (ts == null) return "";
                if (typeof(ts) === 'string') ts = utils.parseTime(ts);
                if (typeof(ts) === 'number') ts = new Date(ts);
                return ts.toString(fmt);
            };
        },
        Number: function(precision, unit, ds) {
            this.format = function(n) {
                if (!utils.isDefined(n) || typeof(n) !== 'number') return "";

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
                return (fs.rootsById[item.root_id] ? fs.rootsById[item.root_id].name : item.root_id) + (item.path.length > 0 ? (":" + (noHtml ? ' ' : '&nbsp;') + item.path) : "");
            }
        },
        addPredefined: function(name, fn) {
            predefined[name] = fn;
        },
        getPredefined: function(name) {
            return predefined[name]();
        }
    };
    formatters.addPredefined('timestamp-short', function() {
        return new formatters.Timestamp(loc.get('shortDateTimeFormat'));
    });
    return formatters;
});
