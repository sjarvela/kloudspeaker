define(['kloudspeaker/app', 'kloudspeaker/settings', 'kloudspeaker/ui/dnd'], function(app, settings, dnd) {
    //TODO remove reference to global "kloudspeaker"
    return function(container, $headerContainer, id, cls, thumbs) {
        var t = this;
        t.$c = $("#" + container);
        t.viewId = 'kloudspeaker-iconview-' + id;

        this.init = function(p) {
            t.p = p;

            $headerContainer.append("<div class='kloudspeaker-iconview-header'></div>");

            kloudspeaker.dom.template("kloudspeaker-tmpl-iconview", {
                viewId: t.viewId
            }).appendTo(t.$c.empty());
            t.$l = $("#" + t.viewId);
            if (cls) t.$l.addClass(cls);
        };

        this.content = function(items, data) {
            t.items = items;
            t.data = data;

            var supportedThumbs = ["jpg", "png", "gif", "jpeg"]; //TODO settings

            kloudspeaker.dom.template("kloudspeaker-tmpl-iconview-item", items, {
                showThumb: function(item) {
                    if (!thumbs || !item.is_file || !item.extension) return false;
                    return (supportedThumbs.indexOf(item.extension.toLowerCase()) >= 0);
                },
                thumbUrl: function(item) {
                    return kloudspeaker.service.url("filesystem/" + item.id + "/thumbnail/");
                },
                typeClass: function(item) {
                    var c = item.is_file ? 'item-file' : 'item-folder';
                    if (item.is_file && item.extension) c += ' item-type-' + item.extension;
                    else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
                    return c;
                }
            }).appendTo(t.$l.empty());

            var $items = t.$l.find(".kloudspeaker-iconview-item").hover(function() {
                $(this).addClass("hover");
            }, function() {
                $(this).removeClass("hover");
            }).bind("contextmenu", function(e) {
                e.preventDefault();
                var $t = $(this);
                t.p.onRightClick($t.tmplItem().data, "", $t);
                return false;
            }).single_double_click(function(e) {
                var $t = $(this);
                var itm = $t.tmplItem().data;
                var $trg = $(e.target);
                if ($trg.hasClass("kloudspeaker-iconview-item-sel-option")) {
                    t.p.onSelectUnselect(itm);
                    return;
                }
                var col = "";
                if ($trg.parent().hasClass("kloudspeaker-iconview-item-info")) col = "info";

                t.p.onClick(itm, col, $t, $t);
            }, function() {
                t.p.onDblClick($(this).tmplItem().data);
            }).attr('unselectable', 'on').css({
                '-moz-user-select': 'none',
                '-webkit-user-select': 'none',
                'user-select': 'none',
                '-ms-user-select': 'none'
            });
            /*.draggable({
                revert: "invalid",
                distance: 10,
                addClasses: false,
                zIndex: 2700
            }).droppable({
                hoverClass: "drophover",
                accept: function(i) { return t.p.canDrop ? t.p.canDrop($(this).tmplItem().data, $(i).tmplItem().data) : false; }
            })*/

            if (dnd) {
                var dragType = t.p.dragType();
                if (dragType) {
                    dnd.enableDrag($items, {
                        onDragStart: function($e, e) {
                            var item = $e.tmplItem().data;
                            var sel = t.p.getSelectedItems();
                            if (!sel) sel = item;
                            else if (sel.indexOf(item) < 0) sel.push(item);
                            return {
                                type: dragType,
                                payload: sel
                            };
                        }
                    });
                }
                dnd.enableDrop(t.$l.find(".kloudspeaker-iconview-item.item-folder"), {
                    canDrop: function($e, e, obj) {
                        if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        return t.p.canDrop(me, i);
                    },
                    dropType: function($e, e, obj) {
                        if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        return t.p.dropType(me, i);
                    },
                    onDrop: function($e, e, obj) {
                        if (!obj || obj.type != 'filesystemitem') return;
                        var i = obj.payload;
                        var me = $e.tmplItem().data;
                        if (t.p.onDrop) t.p.onDrop(me, i);
                    }
                });
            }

            t.p.onContentRendered(items, data);
        };

        /*this.getItemContextElement = function(item) {
            return t.$l.find("#kloudspeaker-iconview-item-"+item.id);
        };*/

        this.getItemContextElement = function(item) {
            return t.$l.find("#kloudspeaker-iconview-item-" + item.id);
        };

        this.getContainerElement = function() {
            return t.$l;
        };

        this.removeHover = function() {
            t.$l.find(".kloudspeaker-iconview-item.hover").removeClass('hover');
        };

        this.setSelectMode = function(sm) {
            t.$l.find(".kloudspeaker-iconview-item.selected").removeClass("selected");
            if (sm) {
                t.$l.addClass("select");
            } else {
                t.$l.removeClass("select");
            }
        };

        this.setSelection = function(items) {
            t.$l.find(".kloudspeaker-iconview-item.selected").removeClass("selected");
            $.each(items, function(i, itm) {
                t.$l.find("#kloudspeaker-iconview-item-" + itm.id).addClass("selected");
            });
        };

        this.updateItems = function(i, data) {
            //TODO
        };
    };
});
