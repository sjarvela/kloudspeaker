define([], function() {
    //TODO remove global references
    var parsers = {
        Number: function(precision) {
            this.parse = function(v) {
                if (!v || typeof(v) !== 'string') return null;
                var text = v.trim();
                var neg = (text.substring(0, 1) == '-');
                text = text.replace(/[^0-9,.]/g, "");

                try {
                    var n = parseFloat(text.replace(/\,/g, '.'));
                    if (isNaN(n) || typeof(n) !== 'number') return null;
                    if (window.def(precision)) {
                        var p = Math.pow(10, precision);
                        n = Math.floor(n * p + 0.50) / p;
                    }
                    return neg ? n * -1 : n;
                } catch (e) {
                    return null;
                }
            };
        }
    };
    return parsers;
});
