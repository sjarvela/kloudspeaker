define([], function() {
    //TODO remove global references

    var et = {};
    et._handlers = [];
    et._handlerTypes = {};
    et._handlersById = {};

    et.addEventHandler = function(h, t, id) {
        if (et._handlers.indexOf(h) >= 0) return;
        et._handlers.push(h);
        if (t) et._handlerTypes[h] = t;
        if (id) et._handlersById[id] = h;
    };

    et.removeEventHandler = function(id) {
        var h = et._handlersById[id];
        if (!h) return;
        et._handlersById[id] = null;
        et._handlers.remove(h);
        et._handlerTypes[h] = false;
    };

    et.dispatch = function(type, payload) {
        var e = {
            type: type,
            payload: payload
        };
        $.each(et._handlers, function(i, h) {
            if (!et._handlerTypes[h] || type == et._handlerTypes[h])
                h(e);
        });
    };

    return et;
});
