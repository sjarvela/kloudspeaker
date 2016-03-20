define([], function() {
    if (!window.ZeroClipboard) return false;

    window.ZeroClipboard.setDefaults({
        moviePath: 'js/lib/ZeroClipboard.swf',
        hoverClass: 'hover',
        activeClass: 'active',
        forceHandCursor: true
    });

    var initialized = false;
    var api = {
        isInitialized: function() {
            return initialized;
        },
        enableCopy: function($e, text, l) {
            if (!initialized) return;

            var clip = $e.data("kloudspeaker-zeroclipboard");
            if (!clip) {
                clip = new window.ZeroClipboard($e);
                $e.data("kloudspeaker-zeroclipboard", clip);
                if (l) $e.data("kloudspeaker-zeroclipboard-listener", l);
            }
            if (text) $e.data("kloudspeaker-zeroclipboard-text", text);
        }
    };
    var $testclip = $('<div id="zeroclipboard-test" style="width=0px; height=0px;"></div>').appendTo($("body"));
    var clip = new window.ZeroClipboard($testclip[0]);
    clip.on('load', function(client) {
        initialized = true;
    });
    clip.on('dataRequested', function() {
        var $t = $(this);
        var l = $t.data("kloudspeaker-zeroclipboard-listener");
        var copied = false;
        if (l && l.onGetText)
            copied = l.onGetText($t);
        if (!copied)
            copied = $t.data("kloudspeaker-zeroclipboard-text");
        if (copied) clip.setText(copied);
    });
    clip.on('mouseover', function() {
        var $t = $(this);
        var l = $t.data("kloudspeaker-zeroclipboard-listener");
        if (l && l.onMouseOver) l.onMouseOver($t, clip);
    });
    clip.on('mouseout', function() {
        var $t = $(this);
        var l = $t.data("kloudspeaker-zeroclipboard-listener");
        if (l && l.onMouseOut) l.onMouseOut($t);
    });
    clip.on('complete', function(client, args) {
        var $t = $(this);
        var l = $t.data("kloudspeaker-zeroclipboard-listener");
        if (l && l.onCopy) l.onCopy($t, args.text);
    });
    return api;
});
