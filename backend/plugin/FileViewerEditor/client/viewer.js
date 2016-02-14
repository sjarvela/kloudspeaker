define(['kloudspeaker/settings', 'kloudspeaker/utils', 'knockout'], function(settings, utils, ko) {
    var opts = {
        hoverInterval: 1000,
        zoomAmount: 0.1
    };

    return function() {
        this.item = ko.observable(null);
        this.loading = ko.observable(true);
        this.zoomable = ko.observable(true);
        this.zoom = 100;

        this.activate = function(item, popup) {
            this.ctx = item;
            this.popupHandle = popup;
        }

        this.attached = function(e) {
            var that = this;
            this.$e = $(e);
            this.$c = this.$e.find(".content-container"); //content target
            this._initHoverToolbar();

            this.$e.find(".content").click(function() {
                that.popupHandle.close();
            });

            $(window).resize(function() {
                that._onResize();
            });

            this.load(this.ctx);
        }

        this._onResize = function() {
            if (this.zoomable())
                this._setZoom();
        }

        this._initHoverToolbar = function() {
            var that = this;
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

        this.load = function(i) {
            var that = this;
            this.item(i.item);
            this.setLoading(true);
            var $l = $("<div class='loader'/>").appendTo(this.$c);
            
            //TODO use internal service instead of direct ajax, handles result/debug & error codes
            $.ajax({
                type: 'GET',
                url: utils.noncachedUrl(i.spec.view.embedded)
            }).done(function(data) {
                $l.html(data.result.html);
                var img = $l.children("img");
                var type = data.type;
                var isImage = ($l.children().length == 1 && img.length == 1);
                var contentInfo = {
                    zoomable: false,
                    cls: 'full'
                };
                var onContentReady = function(info) {
                    that.setLoading(false);
                    that._initContent(info, $l);
                }
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
                        contentInfo.resized = $("#"+data.result['resized_element_id']);
                        contentInfo.resized.css({
                            'width' : '100%',
                            'height' : '100%'
                        });
                    }
                    onContentReady(contentInfo);
                }
            });
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
            this.ci = info;

            this.$vic = $("<div class='viewer-item-content'></div>").append($c);
            this.$vicc = $("<div class='viewer-item-container " + info.cls + "'></div>").append(this.$vic);

            this.$c.empty().append(this.$vicc);
            if (this.ci.zoomable && this.ci.originalHeight < this.$c.height()) {
                this.zoomBase = 'real';
            }
            this._onResize();
        }

        this.close = function() {
            this.popupHandle.close();
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

            this._calcZoomMinMax();
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

            var h = (this.zoomBase == 'fit') ? this.$vicc.height() : this.ci.originalHeight;
            if (this.zoom == 0) {
                this.ci.zoomable.css('height', "");
            } else {
                h = (h * (this.zoom));
                this.ci.zoomable.css('height', h + "px");
            }

            this.ci.zoomable.css('width', (this.ci.originalWidth / this.ci.originalHeight) * h + "px");
            this._reposition();
        }

        this._calcZoomMinMax = function() {
            if (!this.zoomable()) return;

            var h = (this.zoomBase == 'fit') ? this.$vicc.height() : this.ci.originalHeight;
            var minSize = 50;
            //var maxSize = h * 10;

            this.minZoom = Math.ceil((minSize / h) * 10) / 10;
            this.maxZoom = 10;
        }

        this._reposition = function() {
            this.$vic.css("margin-top", "");
            if (this.ci.zoomable) {
                var vich = this.$vic.height();
                var ch = this.$vicc.height();
                if (vich < ch) {
                    this.$vic.css("margin-top", ((ch - vich) / 2) + "px");
                }
            }
        }
    };
});
