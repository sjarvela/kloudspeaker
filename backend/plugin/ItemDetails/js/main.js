define(['kloudspeaker/config', 'kloudspeaker/plugins', 'kloudspeaker/ui/files'], function(config, plugins, uif) {
	console.log('kloudspeaker/plugin/itemdetails');

	// item info
	var typeConfig = false;
	if (config.plugins["ItemDetails"]) {
		typeConfig = {};

		for (var t in config.plugins["ItemDetails"]) {
			var parts = t.split(",");
			var c = config.plugins["ItemDetails"][t];
			for (var i = 0; i < parts.length; i++) {
				var p = parts[i].trim();
				if (p.length > 0)
					typeConfig[p] = c;
			}
		}
	}

	var getApplicableSpec = function(item) {
		var ext = (item.is_file && item.extension) ? item.extension.toLowerCase().trim() : "";
		if (ext.length === 0 || !typeConfig[ext]) {
			ext = item.is_file ? "[file]" : "[folder]";
			if (!typeConfig[ext])
				return typeConfig["*"];
		}
		return typeConfig[ext];
	}

	uif.itemDetails.registerProvider({
		id: "plugin/itemdetails",
		get: function(item, d, pd) {
			if (!typeConfig || !plugins.exists("ItemDetails")) return false;
			var spec = getApplicableSpec(item);
			if (!spec) return false;

			return {
				titleKey: "files.iteminfo.title",
				module: 'kloudspeaker/plugin/itemdetails/iteminfo',
			}
		}
	});
});
