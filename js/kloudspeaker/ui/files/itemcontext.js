define(['kloudspeaker/filesystem', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/events', 'kloudspeaker/session', 'kloudspeaker/permissions', 'kloudspeaker/ui', 'kloudspeaker/dom', 'kloudspeaker/features', 'kloudspeaker/localization', 'kloudspeaker/ui/controls', 'kloudspeaker/utils'], function(fs, plugins, service, events, session, permissions, ui, dom, features, loc, controls, utils) {
    //TODO rewrite

    return function(o) {
        var ict = {};
        ict._activeItemContext = false;

        ict.open = function(spec) {
            var item = spec.item;
            var $e = spec.element;
            var $c = spec.viewport;
            var $t = spec.container;
            var folder = spec.folder;

            var popupId = "mainview-itemcontext-" + item.id;
            if (ui.isActivePopup(popupId)) {
                return;
            }

            var openedId = false;
            if (ict._activeItemContext) {
                openedId = ict._activeItemContext.item.id;
                ict._activeItemContext.close();
                ict._activeItemContext = false;
            }
            if (item.id == openedId) return;

            var $cont = $t || $e.parent();
            var html = dom.template("kloudspeaker-tmpl-main-itemcontext", item, {})[0].outerHTML;
            $e.popover({
                title: item.name,
                html: true,
                placement: 'bottom',
                trigger: 'manual',
                template: '<div class="popover kloudspeaker-itemcontext-popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
                content: html,
                container: $cont
            }).bind("shown", function(e) {
                var api = {
                    id: popupId,
                    hide: function() {
                        $e.popover('destroy');
                    }
                };
                api.close = api.hide;
                ui.activePopup(api);

                var $el = $("#kloudspeaker-itemcontext-" + item.id);
                var $pop = $el.closest(".popover");
                var maxRight = $c.outerWidth();
                var popLeft = $pop.offset().left - $cont.offset().left;
                var popW = $pop.outerWidth();
                if (popLeft < 0)
                    popLeft = 0;
                else if ((popLeft + popW) > maxRight)
                    popLeft = maxRight - popW - 10;
                $pop.css("left", popLeft + "px");

                var arrowPos = ($e.offset().left - $cont.offset().left) + ($e.outerWidth() / 2);
                arrowPos = Math.max(0, (arrowPos - popLeft));
                $pop.find(".arrow").css("left", arrowPos + "px");

                $pop.find(".popover-title").append($('<button type="button" class="close">×</button>').click(api.close));
                var $content = $el.find(".kloudspeaker-itemcontext-content");

                fs.itemDetails(item, plugins.getItemContextRequestData(item)).done(function(d) {
                    if (!d) {
                        api.hide();
                        return;
                    }

                    var ctx = {
                        details: d,
                        folder: spec.folder,
                        folder_writable: spec.folder_writable
                    };
                    ict.renderItemContext(api, $content, item, ctx);
                });
            }).bind("hidden", function() {
                $e.unbind("shown").unbind("hidden");
                ui.removeActivePopup(popupId);
            });
            $e.popover('show');
        };

        ict.renderItemContext = function(cApi, $e, item, ctx) {
            var df = features.hasFeature("descriptions");
            var dp = permissions.hasFilesystemPermission(item, "edit_description", null, true);
            var descriptionEditable = df && dp;
            var showDescription = descriptionEditable || !!ctx.details.metadata.description;

            var pl = plugins.getItemContextPlugins(item, ctx);
            var actions = utils.getPluginActions(pl);
            var primaryActions = utils.getPrimaryActions(actions);
            var secondaryActions = utils.getSecondaryActions(actions);

            var o = {
                item: item,
                details: ctx.details,
                showDescription: showDescription,
                description: ctx.details.metadata.description || '',
                session: session.get(),
                plugins: pl,
                primaryActions: primaryActions
            };

            $e.removeClass("loading").empty().append(dom.template("kloudspeaker-tmpl-main-itemcontext-content", o, {
                title: function(o) {
                    var a = o;
                    if (a.type == 'submenu') a = a.primary;
                    return a.title ? a.title : loc.get(a['title-key']);
                }
            }));
            $e.click(function(e) {
                // prevent from closing the popup when clicking the popup itself
                e.preventDefault();
                return false;
            });
            ui.process($e, ["localize"]);

            if (descriptionEditable) {
                controls.editableLabel({
                    element: $("#kloudspeaker-itemcontext-description"),
                    hint: loc.get('itemcontextDescriptionHint'),
                    onedit: function(desc) {
                        service.put("filesystem/" + item.id + "/description/", {
                            description: desc
                        }).done(function() {
                            events.dispatch("filesystem/item-update", {
                                item: item,
                                property: 'description',
                                value: desc
                            });
                        });
                    }
                });
            }

            if (primaryActions) {
                var $pae = $e.find(".kloudspeaker-itemcontext-primary-action-button");
                $pae.each(function(i, $b) {
                    var a = primaryActions[i];
                    if (a.type == 'submenu') {
                        controls.dropdown({
                            element: $b,
                            items: a.items,
                            hideDelay: 0,
                            style: 'submenu',
                            parentPopupId: cApi.id,
                            onItem: function() {
                                cApi.hide();
                            },
                            onBlur: function(dd) {
                                dd.hide();
                            }
                        });
                    }
                });
                $pae.click(function(e) {
                    var i = $pae.index($(this));
                    var action = primaryActions[i];
                    if (action.type == 'submenu') return;
                    cApi.close();
                    action.callback();
                });
            }

            if (pl) {
                var $selectors = $("#kloudspeaker-itemcontext-details-selectors");
                var $content = $("#kloudspeaker-itemcontext-details-content");
                var contents = {};
                var onSelectDetails = function(id) {
                    $(".kloudspeaker-itemcontext-details-selector").removeClass("active");
                    $("#kloudspeaker-itemcontext-details-selector-" + id).addClass("active");
                    $content.find(".kloudspeaker-itemcontext-plugin-content").hide();

                    var $c = contents[id] ? contents[id] : false;
                    if (!$c) {
                        $c = $('<div class="kloudspeaker-itemcontext-plugin-content"></div>');
                        pl[id].details["on-render"](cApi, $c, ctx);
                        contents[id] = $c;
                        $content.append($c);
                    }

                    $c.show();
                };
                var firstPlugin = false;
                var selectorClick = function() {
                    var s = $(this).tmplItem().data;
                    onSelectDetails(s.id);
                };
                for (var id in pl) {
                    var plugin = pl[id];
                    if (!plugin.details) continue;

                    if (!firstPlugin) firstPlugin = id;

                    var title = plugin.details.title ? plugin.details.title : (plugin.details["title-key"] ? loc.get(plugin.details["title-key"]) : id);
                    var selector = dom.template("kloudspeaker-tmpl-main-itemcontext-details-selector", {
                        id: id,
                        title: title,
                        data: plugin
                    }).appendTo($selectors).click(selectorClick);
                }

                if (firstPlugin) onSelectDetails(firstPlugin);
            }

            controls.dropdown({
                element: $e.find("#kloudspeaker-itemcontext-secondary-actions"),
                items: secondaryActions,
                hideDelay: 0,
                style: 'submenu',
                parentPopupId: cApi.id,
                onItem: function() {
                    cApi.hide();
                },
                onBlur: function(dd) {
                    dd.hide();
                }
            });
        }

        return {
            open: ict.open
        };
    };
});
