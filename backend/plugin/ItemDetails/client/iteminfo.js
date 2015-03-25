define(['kloudspeaker/itemdetails', 'kloudspeaker/utils', 'kloudspeaker/resources', 'knockout'], function(itemdetails, utils, res, ko) {
    var model = {
        item: null,
        groups: null
    };

    var getGroups = function(s, d) {
        var groups = [];
        _.each(utils.getKeys(s), function(k) {
            var spec = s[k];
            var data = d[k];
            if (!data) return;

            var g = 'file';
            if (k == 'image/exif') g = k; //TODO || that.formatters[k]) g = k;

            if (groups.indexOf(g) < 0)
                groups.push(g);
        });
        return groups;
    };

    var getGroupRows = function(g, s, d) {
        //if (that.formatters[g])
        //    return that.formatters[g].getGroupRows(s[g], d[g]);
        if (g == 'image/exif') return getExifRows(s[g], d[g]);

        // file group rows
        var rows = [];
        _.each(utils.getKeys(s), function(k) {
            if (k == 'image/exif') return; //TODO || that.formatters[k]) continue;
            var spec = s[k];

            var rowData = getRowData(d, k);
            if (!rowData) return;

            rows.push({
                title: getFileRowTitle(k, s[k]),
                value: formatFileData(k, rowData)
            });
        });
        return rows;
    };

    var getRowData = function(data, key) {
        return data[key];
    };

    var getFileRowTitle = function(dataKey, rowSpec) {
        /*if (rowSpec.title) return rowSpec.title;
        if (rowSpec["title-key"]) return mollify.ui.texts.get(rowSpec["title-key"]);

        if (dataKey == 'name') return mollify.ui.texts.get('fileItemContextDataName');
        if (dataKey == 'size') return mollify.ui.texts.get('fileItemContextDataSize');
        if (dataKey == 'path') return mollify.ui.texts.get('fileItemContextDataPath');
        if (dataKey == 'extension') return mollify.ui.texts.get('fileItemContextDataExtension');
        if (dataKey == 'last-modified') return mollify.ui.texts.get('fileItemContextDataLastModified');
        if (dataKey == 'image-size') return mollify.ui.texts.get('fileItemContextDataImageSize');
        if (dataKey == 'metadata-created') return mollify.ui.texts.get('fileItemContextDataCreated');*/

        /*if (that.specs[dataKey]) {
            var spec = that.specs[dataKey];
            if (spec.title) return spec.title;
            if (spec["title-key"]) return mollify.ui.texts.get(spec["title-key"]);
        }*/
        return dataKey;
    };

    var formatFileData = function(key, data) {
        //TODO
        /*if (key == 'size') return formattersthat.fileSizeFormatter.format(data);
        if (key == 'last-modified') return that.timestampFormatter.format(mollify.helpers.parseInternalTime(data));
        if (key == 'image-size') return mollify.ui.texts.get('fileItemContextDataImageSizePixels', [data]);
        if (key == 'metadata-created') return that.timestampFormatter.format(mollify.helpers.parseInternalTime(data.at)) + "&nbsp;<i class='icon-user'/>&nbsp;" + data.by.name;

        if (that.specs[key]) {
            var spec = that.specs[key];
            if (spec.formatter) return spec.formatter(data);
        }*/

        return data;
    };

    var getExifRows = function(spec, data) {
        var rows = [];
        for (var section in data) {
            var html = '';
            var first = true;
            var count = 0;
            _.each(utils.getKeys(data[section]), function(key) {
                var v = formatExifValue(section, key, data[section][key]);
                if (!v) return;

                html += '<tr id="exif-row-' + section + '-' + key + '" class="' + (first ? 'exif-row-section-first' : 'exif-row') + '"><td class="exif-key">' + key + '</td><td class="exif-value">' + v + '</td></tr>';
                first = false;
                count++;
            });

            if (count > 0)
                rows.push({
                    title: section,
                    value: '<table class="exif-section-' + section + '">' + html + "</table>"
                });
        }
        return rows;
    };

    this.formatExifValue = function(section, key, value) {
        if (section == 'FILE' && key == 'SectionsFound') return false;
        //TODO format values?
        return value;
    };

    return {
        activate: function(p) {
            console.log("itemdetails/iteminfo");
            var data = p.data().plugins["plugin-itemdetails"];

            model.item = p.item();
            var spec = itemdetails.getApplicableSpec(model.item);

            var groups = getGroups(spec, data);
            var result = [];
            var i = 0;
            _.each(groups, function(g) {
                result.push({
                    key: g,
                    title: "TODO Group " + g, //that.getGroupTitle(g),
                    rows: getGroupRows(g, spec, data)
                });
            });
            model.groups = result;
        },
        getView: function() {
            return res.getPluginUrl('ItemDetails', 'client/views/iteminfo');
        },
        model: model
    };
});
