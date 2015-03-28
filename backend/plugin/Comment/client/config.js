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
            id: 'name',
            titleKey: 'user.name'
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
