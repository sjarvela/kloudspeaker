define(['cloudberry/session', 'knockout'], function(session, ko) {
    var model = {
        username : ko.observable(''),
        password : ko.observable(''),
        remember : ko.observable(false),
        resetEmail: ko.observable('')
    };

    return {
        model: model,
        onLogin: function() {
            session.authenticate(model.username(), model.password(), model.remember());
        },
        onReset: function() {
            alert('reset');
        }
    };
});
