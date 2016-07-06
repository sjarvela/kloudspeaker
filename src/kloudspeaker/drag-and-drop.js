import { inject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import _ from 'underscore';

let defaultSettings = {
    dragimages: {}
}

@inject(EventAggregator)
export class DragAndDrop {
    dragObj = false;
    dragEl = false;
    dragListener = false;

    constructor(events) {
    	
    }

    initialize(settings) {
        this.settings = _.extend({}, settings, defaultSettings);

        $("body").bind('dragover', function(e) {
            if (e.preventDefault) e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "none";
            return false;
        });

        // preload drag images
        var dragImages = _.uniq(_.values(settings.dragimages || []));
        //TODO preload

        /*for (var key in settings.dnd.dragimages) {
            if (!settings.dragimages.hasOwnProperty(key)) continue;
            var img = settings.dnd.dragimages[key];
            if (!img) continue;
            if (dragImages.indexOf(img) >= 0) continue;
            dragImages.push(img);
        }
        if (dragImages) ui.preloadImages(dragImages);*/
    }

    _endDrag(e) {
        if (this.dragEl) {
            this.dragEl.removeClass("dragged");
            if (this.dragListener && this.dragListener.onDragEnd) this.dragListener.onDragEnd(this.dragEl, e);
            this.dragEl = false;
        }
        this.dragObj = false;
        this.dragListener = false;
    }

    enableDragToDesktop(item, e) {
        if (!item) return;
        //TODO var info = fs.getItemDownloadInfo(item);
        //if (info) e.originalEvent.dataTransfer.setData('DownloadURL', ['application/octet-stream', info.name, info.url].join(':'));
    }

    enableDrag($e, cls, l) {
        var that = this;
        $e.delegate('.' + cls, 'dragstart', function(e) {
            that.dragObj = false;
            e.originalEvent.dataTransfer.effectAllowed = "none";
            if (!l.onDragStart) return false;

            that.dragObj = l.onDragStart($(this), e);
            if (!that.dragObj) return false;

            var dragImageType = that.dragObj.type;

            if (that.dragObj.type == 'filesystemitem') {
                var pl = that.dragObj.payload;
                if (!_.isArray(pl) || pl.length == 1) {
                    var item = _.isArray(pl) ? pl[0] : pl;

                    if (!item.is_file) dragImageType = "filesystemitem-folder";
                    else dragImageType = "filesystemitem-file";
                } else {
                    dragImageType = "filesystemitem-many";
                }
                api.enableDragToDesktop(pl, e);
            }
            that.dragEl = $(this);
            that.dragListener = l;
            that.dragEl.addClass("dragged");
            e.originalEvent.dataTransfer.effectAllowed = "copyMove";

            if (that.settings.dragimages[dragImageType]) {
                var img = document.createElement("img");
                img.src = that.settings.dragimages[dragImageType];
                e.originalEvent.dataTransfer.setDragImage(img, 0, 0);
            }
            return;
        }).bind('dragend', function(e) {
            that._endDrag(e);
        });
    }

    enableDrop($e, l) {
        var that = this;

        $e.addClass("droppable").bind('drop', function(e) {
            if (e.stopPropagation) e.stopPropagation();
            if (!l.canDrop || !l.onDrop || !that.dragObj) return;
            var $t = $(this);
            if (l.canDrop($t, e, that.dragObj)) {
                l.onDrop($t, e, that.dragObj);
                $t.removeClass("dragover");
            }
            that._endDrag(e);
        }).bind('dragenter', function(e) {
            if (!l.canDrop || !that.dragObj) return false;
            var $t = $(this);
            if (l.canDrop($t, e, that.dragObj)) {
                $t.addClass("dragover");
            }
        }).bind('dragover', function(e) {
            if (e.preventDefault) e.preventDefault();

            var fx = "none";
            if (l.canDrop && l.dropType && that.dragObj) {
                var $t = $(this);
                if (l.canDrop($t, e, that.dragObj)) {
                    var tp = l.dropType($t, e, that.dragObj);
                    if (tp) fx = tp;
                }
            }

            e.originalEvent.dataTransfer.dropEffect = fx;
            return false;
        }).bind('dragleave', function(e) {
            var $t = $(this);
            $t.removeClass("dragover");
            that.dragTarget = false;
        });
    }
}
