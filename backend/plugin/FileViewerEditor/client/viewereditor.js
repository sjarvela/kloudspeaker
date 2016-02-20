define(['kloudspeaker/settings', 'kloudspeaker/utils', 'kloudspeaker/ui', 'knockout'], function(settings, utils, ui, ko) {
    var opts = {
        hoverInterval: 1000,
        zoomAmount: 0.1
    };

    return function() {
        var that = this;

        this.item = ko.observable(null);
        this.itemInfo = ko.observable(null);
        this.loading = ko.observable(true);
        this.editMode = ko.observable(false);
        this.zoomable = ko.observable(false);
        this.zoom = 100;

        this.viewing = ko.computed(function() {
            return !that.loading() && !that.editMode();
        });
        this.editing = ko.computed(function() {
            return !that.loading() && that.editMode();
        });
        this.fullAvailable = ko.computed(function() {
            return that.viewing() && that.item() && (that.editMode() ? that.item().spec.edit.full : that.item().spec.view.full);
        });

        this.activate = function(ctx, popup) {
            this.ctx = ctx;
            this.popupHandle = popup;
        }

        this.attached = function(e) {
            this.$e = $(e);
            this.$c = this.$e.find(".content-container"); //content target
            this._initHoverToolbar();

            this.$e.find(".content").click(function() {
                that.popupHandle.close();
            });

            $(window).resize(function() {
                that._onResize();
            });

            this.item({
                item: this.ctx.item,
                spec: this.ctx.spec
            });
            if (this.ctx.edit) this.editMode(true);

            this.load();
        }

        this._onResize = function() {
            if (this.zoomable())
                this._setZoom();
        }

        this._initHoverToolbar = function() {
            var $ct = that.$e.find(".content");
            var $ht = that.$e.find(".hover-tools");
            var hideTimeout = false;
            this.$c.hover(function(e) {
                if (hideTimeout) {
                    clearInterval(hideTimeout);
                    hideTimeout = false;
                }
                $ht.show();
            }, function(e) {
                if ($.contains($ct[0], e.relatedTarget)) return;

                if (hideTimeout) {
                    clearInterval(hideTimeout);
                    hideTimeout = false;
                }
                hideTimeout = setTimeout(function() {
                    $ht.hide();
                }, opts.hoverInterval);
            });
            $ht.css("margin-left", (0 - ($ht.outerWidth() / 2)) + "px");
        }

        this.load = function() {
            this.setLoading(true);
            var $l = $("<div class='loader'/>").appendTo(this.$c);

            var editMode = this.editMode();
            var spec = this.item().spec;

            var onContentReady = function(info) {
                that.setLoading(false);
                that._initContent(info, $l);
            }

            if (editMode) {
                $l.append($('<iframe id="editor-frame" width=\"100%\" height:\"100%\" style=\"width:100%;height:100%;border: none;overflow: none;\" />').attr('src', spec.edit.embedded));
                var contentInfo = {
                    zoomable: false,
                    cls: 'full'
                };
                onContentReady(contentInfo);
            } else {
                //TODO use internal service instead of direct ajax, handles result/debug & error codes
                $.ajax({
                    type: 'GET',
                    url: utils.noncachedUrl(editMode ? spec.edit.embedded : spec.view.embedded)
                }).done(function(data) {
                    $l.html(data.result.html);

                    var isImage = false;
                    //TODO type from result
                    var img = $l.children("img");
                    if ($l.children().length == 1 && img.length == 1) isImage = true;

                    var contentInfo = {
                        zoomable: false,
                        cls: 'full'
                    };

                    if (isImage) {
                        contentInfo.zoomable = img;
                        contentInfo.centered = true;
                        contentInfo.cls = 'image';

                        $l.imagesLoaded(function() {
                            contentInfo.originalHeight = img[0].height;
                            contentInfo.originalWidth = img[0].width;
                            onContentReady(contentInfo);
                        });
                    } else {
                        if (data.result['resized_element_id']) {
                            contentInfo.resized = $("#" + data.result['resized_element_id']);
                            contentInfo.resized.css({
                                'width': '100%',
                                'height': '100%'
                            });
                        }
                        onContentReady(contentInfo);
                    }
                });
            }
        }

        this.setLoading = function(l) {
            if (l) this.$c.empty().append($("<div class='loading'></div>"));
            this.loading(l);
        }

        this._initContent = function(info, $loader) {
            var $c = $loader.children().remove();
            $loader.remove();

            this.zoomable(info.zoomable);
            this.zoom = 1;
            this.zoomBase = 'fit';
            this.itemInfo(info);

            this.$vic = $("<div class='viewer-item-content'></div>").append($c);
            this.$vicc = $("<div class='viewer-item-container " + info.cls + "'></div>").append(this.$vic);

            this.$c.empty().append(this.$vicc);
            if (this.itemInfo().zoomable && this.itemInfo().originalHeight < this.$c.height()) {
                this.zoomBase = 'real';
            }
            this._onResize();
        }

        this.close = function() {
            this.popupHandle.close();
        }

        this.edit = function() {
            this.editMode(true);
            this.load();
        }

        this.save = function() {
            if (!this.editMode()) return;

            document.getElementById('editor-frame').contentWindow.onEditorSave(function() {
                if (!that.item().spec.view.embedded)
                    that.close();
                else {
                    that.editMode(false);
                    that.load();
                }
                events.dispatch("filesystem/edit", item);
            }, function(c, er) {
                that.close();
                return true;
            });
        }

        this.cancelEdit = function() {
            this.editMode(false);
            this.load();
        }

        this.viewFull = function() {
            this.close();
            ui.window.open(this.editMode() ? this.item().spec.edit.full : this.item().spec.view.full);
        }

        this.zoomIn = function() {
            this._zoom(-1 * opts.zoomAmount);
        }

        this.zoomOut = function() {
            this._zoom(opts.zoomAmount);
        }

        this.zoomReal = function() {
            this.zoom = 1;
            this.zoomBase = 'real';
            this._setZoom();
        }

        this.zoomFit = function() {
            this.zoom = 1;
            this.zoomBase = 'fit';
            this._setZoom();
        }

        this._zoom = function(a) {
            if (!this.zoomable()) return;

            this.zoom += a;
            this._setZoom();
        }

        this._setZoom = function() {
            if (!this.zoomable()) return;

            var itemInfo = this.itemInfo();
            this._calcZoomMinMax();
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

            var h = (this.zoomBase == 'fit') ? this.$vicc.height() : itemInfo.originalHeight;
            if (this.zoom == 0) {
                itemInfo.zoomable.css('height', "");
            } else {
                h = (h * (this.zoom));
                itemInfo.zoomable.css('height', h + "px");
            }

            itemInfo.zoomable.css('width', (itemInfo.originalWidth / itemInfo.originalHeight) * h + "px");
            this._reposition();
        }

        this._calcZoomMinMax = function() {
            if (!this.zoomable()) return;

            var h = (this.zoomBase == 'fit') ? this.$vicc.height() : this.itemInfo().originalHeight;
            var minSize = 50;
            //var maxSize = h * 10;

            this.minZoom = Math.ceil((minSize / h) * 10) / 10;
            this.maxZoom = 10;
        }

        this._reposition = function() {
            this.$vic.css("margin-top", "");
            if (this.itemInfo().zoomable) {
                var vich = this.$vic.height();
                var ch = this.$vicc.height();
                if (vich < ch) {
                    this.$vic.css("margin-top", ((ch - vich) / 2) + "px");
                }
            }
        }
    };
});
