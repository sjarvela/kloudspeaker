define(['kloudspeaker/config', 'kloudspeaker/localization', 'kloudspeaker/resources', 'kloudspeaker/plugins', 'kloudspeaker/ui/files'], function(config, loc, res, plugins, uif) {
	console.log('kloudspeaker/comments');

	loc.addNamespace("comments", res.getPluginUrl('Comment'));

	uif.itemDetails.registerProvider({
		id: "comments",
		get: function(item, d, pd) {
			if (!plugins.exists("Comment")) return false;

			return {
				titleKey: "comments:iteminfo.title",
				module: 'kloudspeaker/comments/iteminfo',
			}
		}
	});
});
