define(['kloudspeaker/service', 'kloudspeaker/localization', 'kloudspeaker/ui/formatters', 'kloudspeaker/utils', 'kloudspeaker/session'], function(service, loc, formatters, utils, session) {
    var processComments = function(comments) {
        var s = session.get();
        var userId = s.user_id;
        var timestampFormatter = new formatters.Timestamp(loc.get('shortDateTimeFormat'));

        //TODO _.each
        for (var i = 0, j = comments.length; i < j; i++) {
            comments[i].time = timestampFormatter.format(utils.parseInternalTime(comments[i].time));
            //comments[i].comment = comments[i].comment.replace(new RegExp('\n', 'g'), '<br/>');
            comments[i].remove = (s.user && s.user.admin) || (userId == comments[i].user_id);
        }
        return comments;
    };
    return {
        getAllCommentsForItem: function(item, permission) {
            return service.get("p/comment/items/" + item.id + "/comments" + (permission ? '?p=1' : '')).done(processComments);
        }
    }
});
