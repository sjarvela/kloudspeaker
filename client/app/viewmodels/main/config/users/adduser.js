define(['kloudspeaker/service', 'knockout'], function(service, ko) {
    return function() {
        console.log("add user init");

        var model = {
            name: ko.observable('')
        }

        return {
            activate: function(d) {
                console.log("add user activate");
                console.log(d);

                var onAdd = function() {
                    var user = {
                        name: model.name()
                    };
                    //TODO validate
                    if (user.name.length < 1) return;

                    d.done(user);
                };

                d.initModal({
                    buttons: [{
                        titleKey: 'ok',
                        handler: onAdd
                    }, {
                        titleKey: 'cancel',
                        close: true
                    }]
                });
            },
            model: model
        }
    };
});
