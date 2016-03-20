define(['kloudspeaker/settings', 'kloudspeaker/plugins', 'kloudspeaker/localization', 'kloudspeaker/events', 'kloudspeaker/ui/formatters', 'kloudspeaker/templates', 'kloudspeaker/dom', 'kloudspeaker/utils'], function(settings, plugins, loc, events, formatters, templates, dom, utils) {
    var that = {};
    that.formatters = {};
    that.typeConfs = false;

    that.initialize = function() {
        var conf = (settings.plugins && settings.plugins.itemdetails) ? settings.plugins.itemdetails : false;

        if (conf) {
            that.typeConfs = {};

            for (var t in conf.filetypes) {
                var parts = t.split(",");
                var c = conf.filetypes[t];
                for (var i = 0; i < parts.length; i++) {
                    var p = parts[i].trim();
                    if (p.length > 0)
                        that.typeConfs[p] = c;
                }
            }
        }

        events.on('localization/init', function() {
            that.fileSizeFormatter = new formatters.ByteSize(new formatters.Number(2, false, loc.get('decimalSeparator')));
            that.timestampFormatter = new formatters.Timestamp(loc.get('shortDateTimeFormat'));
        });
    };

    that.getApplicableSpec = function(item) {
        var ext = (item.is_file && item.extension) ? item.extension.toLowerCase().trim() : "";
        if (ext.length === 0 || !that.typeConfs[ext]) {
            ext = item.is_file ? "[file]" : "[folder]";
            if (!that.typeConfs[ext])
                return that.typeConfs["*"];
        }
        return that.typeConfs[ext];
    }

    that.renderItemContextDetails = function(el, item, $content, data) {
        $content.addClass("loading");
        templates.load("itemdetails-content", utils.noncachedUrl(plugins.url("ItemDetails", "content.html"))).done(function() {
            $content.removeClass("loading");
            that.renderItemDetails(el, item, {
                element: $content.empty(),
                data: data
            });
        });
    };

    that.renderItemDetails = function(el, item, o) {
        var s = that.getApplicableSpec(item);
        var groups = that.getGroups(s, o.data);

        var result = [];
        for (var i = 0, j = groups.length; i < j; i++) {
            var g = groups[i];
            result.push({
                key: g,
                title: that.getGroupTitle(g),
                rows: that.getGroupRows(g, s, o.data)
            });
        }

        /*var data = [];
        for (var k in s) {
            var rowSpec = s[k];
            var rowData = o.data[k];
            if (!rowData) continue;
            
            data.push({key:k, title:that.getTitle(k, rowSpec), value: that.formatData(k, rowData)});
        }*/
        dom.template("itemdetails-template", {
            groups: result
        }).appendTo(o.element);
    };

    that.getGroups = function(s, d) {
        var groups = [];
        for (var k in s) {
            var spec = s[k];
            var data = d[k];
            if (!data) continue;

            var g = 'file';
            if (k == 'exif' || that.formatters[k]) g = k;

            if (groups.indexOf(g) < 0)
                groups.push(g);
        }
        return groups;
    };

    that.getGroupTitle = function(g) {
        if (that.formatters[g]) {
            var f = that.formatters[g];
            if (f.groupTitle) return f.groupTitle;
            if (f["group-title-key"]) return loc.get(f["group-title-key"]);
        }
        if (g == 'file') return loc.get('fileItemDetailsGroupFile');
        if (g == 'exif') return loc.get('fileItemDetailsGroupExif');
        return '';
    };

    that.getGroupRows = function(g, s, d) {
        if (that.formatters[g])
            return that.formatters[g].getGroupRows(s[g], d[g]);
        if (g == 'exif') return that.getExifRows(s[g], d[g]);

        // file group rows
        var rows = [];
        for (var k in s) {
            if (k == 'exif' || that.formatters[k]) continue;
            var spec = s[k];

            var rowData = d[k];
            if (!rowData && k == 'metadata-modified') {
                rowData = d['metadata-created'];
            }
            if (!rowData) {
                continue;
            }

            rows.push({
                title: that.getFileRowTitle(k, s[k]),
                value: that.formatFileData(k, rowData)
            });
        }
        return rows;
    };

    that.getFileRowTitle = function(dataKey, rowSpec) {
        if (rowSpec.title) return rowSpec.title;
        if (rowSpec["title-key"]) return loc.get(rowSpec["title-key"]);

        if (dataKey == 'name') return loc.get('fileItemContextDataName');
        if (dataKey == 'size') return loc.get('fileItemContextDataSize');
        if (dataKey == 'path') return loc.get('fileItemContextDataPath');
        if (dataKey == 'extension') return loc.get('fileItemContextDataExtension');
        if (dataKey == 'last-modified') return loc.get('fileItemContextDataLastModified');
        if (dataKey == 'image-size') return loc.get('fileItemContextDataImageSize');
        if (dataKey == 'metadata-created') return loc.get('fileItemContextDataCreated');
        if (dataKey == 'metadata-modified') return loc.get('fileItemContextDataLastModified');

        /*if (that.specs[dataKey]) {
            var spec = that.specs[dataKey];
            if (spec.title) return spec.title;
            if (spec["title-key"]) return loc.get(spec["title-key"]);
        }*/
        return dataKey;
    };

    that.formatFileData = function(key, data) {
        if (key == 'size') return that.fileSizeFormatter.format(data);
        if (key == 'last-modified') return that.timestampFormatter.format(utils.parseInternalTime(data));
        if (key == 'image-size') return loc.get('fileItemContextDataImageSizePixels', [data]);
        if (key == 'metadata-created') return that.timestampFormatter.format(utils.parseInternalTime(data.at)) + "&nbsp;<i class='fa fa-user'/>&nbsp;" + (data.by ? data.by.name : "-");
        if (key == 'metadata-modified') return that.timestampFormatter.format(utils.parseInternalTime(data.at)) + "&nbsp;<i class='fa fa-user'/>&nbsp;" + (data.by ? data.by.name : "-");

        if (that.specs[key]) {
            var spec = that.specs[key];
            if (spec.formatter) return spec.formatter(data);
        }

        return data;
    };

    that.getExifRows = function(spec, data) {
        var rows = [];
        for (var section in data) {
            var html = '';
            var first = true;
            var count = 0;
            for (var key in data[section]) {
                var v = that.formatExifValue(section, key, data[section][key]);
                if (!v) continue;

                html += '<tr id="exif-row-' + section + '-' + key + '" class="' + (first ? 'exif-row-section-first' : 'exif-row') + '"><td class="exif-key">' + key + '</td><td class="exif-value">' + v + '</td></tr>';
                first = false;
                count++;
            }

            if (count > 0)
                rows.push({
                    title: section,
                    value: '<table class="exif-section-' + section + '">' + html + "</table>"
                });
        }
        return rows;
    };

    that.formatExifValue = function(section, key, value) {
        if (section == 'FILE' && key == 'SectionsFound') return false;
        //TODO format values?
        return value;
    };

    plugins.register({
        id: "plugin-itemdetails",
        initialize: that.initialize,
        itemContextRequestData: function(item) {
            if (!that.typeConfs) return false;
            var spec = that.getApplicableSpec(item);
            if (!spec) return false;

            var data = [];
            for (var k in spec)
                data.push(k);
            return data;
        },
        itemContextHandler: function(item, ctx, data) {
            if (!data || !that.typeConfs) return false;
            var spec = that.getApplicableSpec(item);
            if (!spec) return false;

            return {
                details: {
                    "title-key": "pluginItemDetailsContextTitle",
                    "on-render": function(el, $content) {
                        that.renderItemContextDetails(el, item, $content, data);
                    }
                }
            };
        }
    });
});
