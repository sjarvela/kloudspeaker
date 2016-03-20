define(['kloudspeaker/utils', 'kloudspeaker/permissions'], function(util, p) {
    return {
        __moduleName: 'AccountView',

        AccountView: function() {
            var that = this;

            this.username = 'foo';

            this.activate = function() {
                console.log("activate acc");
            };

            this.usernameChanged = function(nv) {
                console.log('uc');
            }

            this.onClick = function() {
                alert(this.username);
            };
        }
    }
});
