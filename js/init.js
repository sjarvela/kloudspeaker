if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    }
}

if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(s) {
        if (!s || s.length === 0) return false;
        return this.substring(0, s.length) == s;
    }
}

if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(s) {
        if (!s || s.length === 0) return false;
        return this.substring(s.length - 1, 1) == s;
    }
}

if (typeof String.prototype.count !== 'function') {
    String.prototype.count = function(search) {
        var m = this.match(new RegExp(search.toString().replace(/(?=[.\\+*?\[\^\]$(){}\|])/g, "\\"), "g"));
        return m ? m.length : 0;
    }
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj, start) {
        for (var i = (start || 0), j = this.length; i < j; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function(from, to) {
        if (typeof(to) == 'undefined' && (typeof(from) == 'object' || typeof(from) == 'function'))
            from = this.indexOf(from);
        if (from < 0) return;
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };
}

//TODO remove global kloudspeaker
//TODO warn deprecated "kloudspeaker.App.init"
var kloudspeaker = {
    App: {
        init: function(s, p) {
            if (console && console.log) console.log("Kloudspeaker.App.init is deprected, and will be removed. Use require instead.");

            require(['kloudspeaker/app'], function(app) {
                app.init(s, p);
            });
        }
    },
    view: {}
};
window.kloudspeaker = kloudspeaker;
