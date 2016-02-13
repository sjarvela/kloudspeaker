define(['kloudspeaker/settings', 'kloudspeaker/utils', 'knockout'], function(settings, utils, ko) {
    var opts = {
        hoverInterval: 1000
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
            $ht.css("margin-left", (0 - ($ht.width() / 2)) + "px");
        }

        this.load = function(i) {
            var that = this;
            this.item(i.item);
            this.loading(true);
            var $l = $("<div class='loader'/>").appendTo(this.$c);
            $.ajax({
                type: 'GET',
                url: utils.noncachedUrl(i.spec.view.embedded)
            }).done(function(data) {
                $l.html(data.result.html);
                var img = $l.children("img");
                var isImage = ($l.children().length == 1 && img.length == 1);
                var contentInfo = {
                    zoomable: false,
                    cls: ''
                };
                var onContentReady = function(info) {
                    that.loading(false);
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
                    onContentReady(contentInfo);
                }
            });
        }

        this._initContent = function(info, $loader) {
            var $c = $loader.children().remove();
            $loader.remove();

            this.zoomable(info.zoomable);
            this.zoom = 100;
            this.ci = info;

            this.$vic = $("<div class='viewer-item-content'></div>").append($c);
            this.$c.empty().append($("<div class='viewer-item-container " + info.cls + "'></div>").append(this.$vic));
            if (this.ci.zoomable && this.ci.originalHeight < this.$c.height()) this.zoom = 'real';
            this._onResize();
        }

        this.close = function() {
            this.popupHandle.close();
        }

        this.zoomIn = function() {
            this._zoom(-10);
        }

        this.zoomOut = function() {
            this._zoom(10);
        }

        this.zoomReal = function() {
            this.zoom = 'real';
            this._setZoom();
        }

        this.zoomFit = function() {
            this.zoom = 100;
            this._setZoom();
        }

        this._zoom = function(a) {
            if (!this.zoomable()) return;

            this.zoom = Math.max(10, Math.min(300, this.zoom + a));
            this._setZoom();
        }

        this._setZoom = function() {
            if (!this.zoomable()) return;

            var h = this.$c.height();

            if (this.zoom == 'real') {
                this.ci.zoomable.css('height', "auto");
                h = this.ci.originalHeight;
            } else {
                if (this.zoom == 100) {
                    this.ci.zoomable.css('height', "");
                } else {
                    h = (h * (this.zoom / 100));
                    this.ci.zoomable.css('height', h + "px");
                }
            }

            this.ci.zoomable.css('width', (this.ci.originalWidth / this.ci.originalHeight) * h + "px");
            this._reposition();
        }

        this._reposition = function() {
            this.$vic.css("margin-top", "");
            if (this.ci.zoomable) {
                var vich = this.$vic.height();
                var ch = this.$c.height();
                if (vich < ch) {
                    this.$vic.css("margin-top", ((ch - vich) / 2) + "px");
                }
            }
        }
    };
});
