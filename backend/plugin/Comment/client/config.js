define(['kloudspeaker/comments/repository', 'kloudspeaker/utils'], function(repository, utils) {
    console.log('kloudspeaker/comments/config');

    var model = {};
    var listRefresh = utils.createNotifier();
    var onRemoveComment = function(c) {

    };

    return {
        activate: function(id) {
            console.log("config/comments/" + id);
            
            return true;
        },
        cols: [{
            id: 'id',
            titleKey: 'main.config.list.id'
        }, {
            id: 'time',
            titleKey: 'comment:config.list.time'
        }, {
            id: 'item_id',
            titleKey: 'comment:config.list.item'
        }, {
            id: 'user_id',
            titleKey: 'comment:config.list.user'
        }, {
            id: 'remove',
            type: 'action',
            icon: 'trash',
            title: '',
            action: onRemoveComment
        }],
        remote: {
            handler: repository.query,
            refresh: listRefresh
        },
        model: model
    };
});
