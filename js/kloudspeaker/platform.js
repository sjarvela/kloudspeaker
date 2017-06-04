define(['knockout', 'text', 'durandal/system', 'durandal/viewlocator', 'durandal/composition', 'durandal/binder', 'durandal/plugins/widget'], function(ko, txt, ds, vl, comp, binder, dw) {
    var setup = function() {
        require(['kloudspeaker/settings', 'kloudspeaker/localization', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/uploader', 'kloudspeaker/ui/clipboard', 'kloudspeaker/ui/dnd'], function(settings, loc, formatters, uploader, clipboard, dnd) {
            ds.debug(!!settings.debug); //TODO remove

            //install durandal widget plugin
            dw.install({});
            dw.registerKind('time-picker');
            dw.registerKind('config-list');

            //configure knockout validation
            ko.validation.customRuleMessage = function(rule, ctx) {
                if (ctx.message) return ctx.message;
                return loc.get("validationError-" + ctx.rule);
            };
            ko.validation.init({
                insertMessages: false,
                decorateInputElement: true,
                errorElementClass: 'error',
                errorMessageClass: 'help-inline',
                parseInputAttributes: true,
                //decorateElementOnModified: false,
            });
            ko.validation.rules.areSame = {
                getValue: function(o) {
                    return (typeof o === 'function' ? o() : o);
                },
                validator: function(val, otherField) {
                    var ov = this.getValue(otherField);
                    return val === ov;
                },
                message: 'The fields must have the same value'
            };
            ko.validation.registerExtenders();

            // knockout
            ko.bindingHandlers.enterkey = {
                init: function(element, valueAccessor, allBindings, viewModel) {
                    var callback = valueAccessor();
                    $(element).keypress(function(event) {
                        var keyCode = (event.which ? event.which : event.keyCode);
                        if (keyCode === 13) {
                            callback.call(viewModel);
                            return false;
                        }
                        return true;
                    });
                }
            };

            // format
            var _format = function(e, va, ab, vm, bc) {
                var $e = $(e);
                var v = va();
                var value = ko.unwrap(v);
                var formatter = ab.get('formatter');
                var val = '';
                if (formatter) {
                    if (typeof(formatter) === 'function') val = formatter(value);
                    else if (typeof(formatter) === 'string') val = formatters.getPredefined(formatter).format(value);
                    else val = formatter.format(value);
                } else {
                    if (value)
                        val = '' + value;
                }

                var target = $e.attr('data-format-target');
                if (!target || target == 'text')
                    $e.text(val);
                else if (target == 'value')
                    $e.val(val);
            };
            comp.addBindingHandler('format', {
                //init: _format,
                update: _format
            });

            // i18n
            var _i18n = function(e, va) {
                var v = va();
                var value = ko.unwrap(v);
                var l = loc.get(value) || '';
                var $e = $(e);
                var target = $e.attr('data-i18n-bind-target');
                if (target && target != 'text')
                    $e.attr(target, l);
                else
                    $e.text(l);
            };
            comp.addBindingHandler('i18n', {
                //init: _i18n,
                update: _i18n
            });

            var _uploader = function(e, va) {
                var v = va();
                var value = ko.unwrap(v);
                var $e = $(e);
                var spec = {
                    url: value.url
                };
                if (value.dropTargetId) spec.dropElement = $("#" + value.dropTargetId);
                if (value.handler) spec.handler = value.handler;
                uploader.initUploadWidget($e, spec);
            }
            comp.addBindingHandler('uploader', {
                //init: _i18n,
                update: _uploader
            });

            comp.addBindingHandler('dom-effect', {
                init: function(e, va) {
                    var v = va();
                    var value = ko.unwrap(v);
                    var $e = $(e);
                    if (value == 'hover') {
                        $e.hover(function() {
                            $e.addClass("hover");
                        }, function() {
                            $e.removeClass("hover");
                        });
                    }
                }
            });

            comp.addBindingHandler('clipboard', {
                update: function(e, va) {
                    var v = va();
                    var value = ko.unwrap(v);
                    var $e = $(e);

                    if (!clipboard.isInitialized()) {
                        $e.addClass("no-clipboard");
                        return;
                    } else {
                        clipboard.enableCopy($e, (typeof(value.data) === 'function' ? value.data() : value.data), {
                            onMouseOver: function($e, clip) {
                                if (value.hand) clip.setHandCursor(true);
                                if (value.hover) $e.addClass("hover");
                            },
                            onMouseOut: function($e) {
                                if (value.hover) $e.removeClass("hover");
                            }
                        });
                    }
                }
            });

            binder.binding = function(obj, view) {
                $(view).find("[data-i18n]").each(function() {
                    var $t = $(this);
                    var key = $t.attr("data-i18n");
                    var attr = false;
                    if (key.indexOf('[') === 0) {
                        var parts = key.split(']');
                        key = parts[1];
                        attr = parts[0].substr(1, parts[0].length - 1);
                    }
                    if (!attr) $t.text(loc.get(key));
                    else $t.attr(attr, loc.get(key));
                });
            };

            var modulesPath = 'viewmodels';
            vl.useConvention(modulesPath, settings['templates-path']);
            var reg = new RegExp(escape(modulesPath), 'gi');
            vl.convertModuleIdToViewId = function(moduleId) {
                //var path = moduleId.replace(reg, viewsPath);
                var path = moduleId;
                if (moduleId.startsWith('viewmodels/'))
                    path = viewsPath + moduleId.substring(11);
                else {
                    _.each(packages, function(p) {
                        var pn = p.name + '/';
                        if (moduleId.startsWith(pn)) {
                            path = p.location + "/views/" + moduleId.substring(pn.length);
                            return false;
                        }
                    });
                }
                //TODO map
                //console.log("Resolve view:" + moduleId + " -> " + path);
                return path;
            };
        });
    };

    return {
        setup: setup,
        composition: comp
    };
});
