define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/plugins'], function(app, settings, plugins) {
    //TODO remove reference to global "kloudspeaker"

    var that = {};
    that.formatters = {};
    that.typeConfs = false;

    that.initialize = function() {
        that.fileSizeFormatter = new kloudspeaker.ui.formatters.ByteSize(new kloudspeaker.ui.formatters.Number(2, false, kloudspeaker.ui.texts.get('decimalSeparator')));
        that.timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));
        /*if (sp) {
            for (var i=0; i<sp.length;i++)
                that.addDetailsSpec(sp[i]);
        }*/
        var conf = settings.plugins.itemdetails;
        if (!conf) conf = kloudspeaker.plugin.conf.itemdetails; //legacy

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
    };

    /*this.addDetailsSpec = function(s) {
        if (!s || !s.key) return;
        that.specs[s.key] = s;
    }*/

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
        kloudspeaker.templates.load("itemdetails-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.url("ItemDetails", "content.html"))).done(function() {
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
        kloudspeaker.dom.template("itemdetails-template", {
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
            if (f["group-title-key"]) return kloudspeaker.ui.texts.get(f["group-title-key"]);
        }
        if (g == 'file') return kloudspeaker.ui.texts.get('fileItemDetailsGroupFile');
        if (g == 'exif') return kloudspeaker.ui.texts.get('fileItemDetailsGroupExif');
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
        if (rowSpec["title-key"]) return kloudspeaker.ui.texts.get(rowSpec["title-key"]);

        if (dataKey == 'name') return kloudspeaker.ui.texts.get('fileItemContextDataName');
        if (dataKey == 'size') return kloudspeaker.ui.texts.get('fileItemContextDataSize');
        if (dataKey == 'path') return kloudspeaker.ui.texts.get('fileItemContextDataPath');
        if (dataKey == 'extension') return kloudspeaker.ui.texts.get('fileItemContextDataExtension');
        if (dataKey == 'last-modified') return kloudspeaker.ui.texts.get('fileItemContextDataLastModified');
        if (dataKey == 'image-size') return kloudspeaker.ui.texts.get('fileItemContextDataImageSize');
        if (dataKey == 'metadata-created') return kloudspeaker.ui.texts.get('fileItemContextDataCreated');
        if (dataKey == 'metadata-modified') return kloudspeaker.ui.texts.get('fileItemContextDataLastModified');

        /*if (that.specs[dataKey]) {
            var spec = that.specs[dataKey];
            if (spec.title) return spec.title;
            if (spec["title-key"]) return kloudspeaker.ui.texts.get(spec["title-key"]);
        }*/
        return dataKey;
    };

    that.formatFileData = function(key, data) {
        if (key == 'size') return that.fileSizeFormatter.format(data);
        if (key == 'last-modified') return that.timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(data));
        if (key == 'image-size') return kloudspeaker.ui.texts.get('fileItemContextDataImageSizePixels', [data]);
        if (key == 'metadata-created') return that.timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(data.at)) + "&nbsp;<i class='icon-user'/>&nbsp;" + (data.by ? data.by.name : "-");
        if (key == 'metadata-modified') return that.timestampFormatter.format(kloudspeaker.helpers.parseInternalTime(data.at)) + "&nbsp;<i class='icon-user'/>&nbsp;" + (data.by ? data.by.name : "-");

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