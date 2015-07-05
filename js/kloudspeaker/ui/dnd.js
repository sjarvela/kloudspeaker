define(['kloudspeaker/settings', 'kloudspeaker/filesystem', 'kloudspeaker/ui'], function(settings, fs, ui) {
    var t = {};
    t.dragObj = false;
    t.dragEl = false;
    t.dragListener = false;

    var endDrag = function(e) {
        if (t.dragEl) {
            t.dragEl.removeClass("dragged");
            if (t.dragListener && t.dragListener.onDragEnd) t.dragListener.onDragEnd(t.dragEl, e);
            t.dragEl = false;
        }
        t.dragObj = false;
        t.dragListener = false;
    };

    $("body").bind('dragover', function(e) {
        if (e.preventDefault) e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = "none";
        return false;
    });

    // preload drag images      
    setTimeout(function() {
        var dragImages = [];
        for (var key in settings.dnd.dragimages) {
            if (!settings.dnd.dragimages.hasOwnProperty(key)) continue;
            var img = settings.dnd.dragimages[key];
            if (!img) continue;
            if (dragImages.indexOf(img) >= 0) continue;
            dragImages.push(img);
        }
        if (dragImages) ui.preloadImages(dragImages);
    }, 0);

    var api = {
        enableDragToDesktop: function(item, e) {
            if (!item) return;
            var info = fs.getItemDownloadInfo(item);
            if (info) e.originalEvent.dataTransfer.setData('DownloadURL', ['application/octet-stream', info.name, info.url].join(':'));
        },

        enableDrag: function($e, l) {
            $e.attr("draggable", "true").bind('dragstart', function(e) {
                t.dragObj = false;
                e.originalEvent.dataTransfer.effectAllowed = "none";
                if (!l.onDragStart) return false;

                t.dragObj = l.onDragStart($(this), e);
                if (!t.dragObj) return false;

                var dragImageType = t.dragObj.type;

                if (t.dragObj.type == 'filesystemitem') {
                    var pl = t.dragObj.payload;
                    if (!window.isArray(pl) || pl.length == 1) {
                        var item = window.isArray(pl) ? pl[0] : pl;

                        if (!item.is_file) dragImageType = "filesystemitem-folder";
                        else dragImageType = "filesystemitem-file";
                    } else {
                        dragImageType = "filesystemitem-many";
                    }
                    api.enableDragToDesktop(pl, e);
                }
                t.dragEl = $(this);
                t.dragListener = l;
                t.dragEl.addClass("dragged");
                e.originalEvent.dataTransfer.effectAllowed = "copyMove";

                if (settings.dnd.dragimages[dragImageType]) {
                    var img = document.createElement("img");
                    img.src = settings.dnd.dragimages[dragImageType];
                    e.originalEvent.dataTransfer.setDragImage(img, 0, 0);
                }
                return;
            }).bind('dragend', function(e) {
                endDrag(e);
            });
        },
        enableDrop: function($e, l) {
            $e.addClass("droppable").bind('drop', function(e) {
                if (e.stopPropagation) e.stopPropagation();
                if (!l.canDrop || !l.onDrop || !t.dragObj) return;
                var $t = $(this);
                if (l.canDrop($t, e, t.dragObj)) {
                    l.onDrop($t, e, t.dragObj);
                    $t.removeClass("dragover");
                }
                endDrag(e);
            }).bind('dragenter', function(e) {
                if (!l.canDrop || !t.dragObj) return false;
                var $t = $(this);
                if (l.canDrop($t, e, t.dragObj)) {
                    $t.addClass("dragover");
                }
            }).bind('dragover', function(e) {
                if (e.preventDefault) e.preventDefault();

                var fx = "none";
                if (l.canDrop && l.dropType && t.dragObj) {
                    var $t = $(this);
                    if (l.canDrop($t, e, t.dragObj)) {
                        var tp = l.dropType($t, e, t.dragObj);
                        if (tp) fx = tp;
                    }
                }

                e.originalEvent.dataTransfer.dropEffect = fx;
                return false;
            }).bind('dragleave', function(e) {
                var $t = $(this);
                $t.removeClass("dragover");
                t.dragTarget = false;
            });
        }
    };
    return api;
});
