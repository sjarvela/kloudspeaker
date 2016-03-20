define(['kloudspeaker/utils', 'kloudspeaker/ui/controls', 'kloudspeaker/dom'], function(utils, controls, dom) {
    return function($e, o) {
        dom.template("kloudspeaker-tmpl-configlistview", {
            title: o.title,
            actions: o.actions || false
        }).appendTo($e);
        var $table = $e.find(".kloudspeaker-configlistview-table");
        var table = controls.table($table, o.table);
        var enableAction = function(id, e) {
            if (e)
                $e.find("#kloudspeaker-configlistview-action-" + id).removeClass("disabled");
            else
                $e.find("#kloudspeaker-configlistview-action-" + id).addClass("disabled");
        };
        if (o.actions) {
            $.each(o.actions, function(i, a) {
                if (a.depends) enableAction(a.id, false);
                if (a.tooltip) controls.tooltip($("#kloudspeaker-configlistview-action-" + a.id), {
                    title: a.tooltip
                });
            });

            table.onSelectionChanged(function() {
                var sel = table.getSelected();
                var any = sel.length > 0;
                var one = sel.length == 1;
                var many = sel.length > 1;
                $.each(o.actions, function(i, a) {
                    if (!a.depends) return;
                    if (a.depends == "table-selection") enableAction(a.id, any);
                    else if (a.depends == "table-selection-one") enableAction(a.id, one);
                    else if (a.depends == "table-selection-many") enableAction(a.id, many);
                });
            });
            $e.find(".kloudspeaker-configlistview-actions > .kloudspeaker-configlistview-action").click(function() {
                if ($(this).hasClass("disabled")) return;
                var action = $(this).tmplItem().data;
                if (!action.callback) return;

                var p;
                if (action.depends && action.depends.startsWith("table-selection")) p = table.getSelected();
                action.callback(p);
            });
        }

        return {
            table: table,
            enableAction: enableAction
        };
    };
});
