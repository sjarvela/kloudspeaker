define(['kloudspeaker/utils'],
    function (utils) {
        return {
            sort: function (list, sortFn, fallbackSortFn, _itemsById) {
                var itemsById = _itemsById;
                if (!itemsById) itemsById = utils.mapByKey(list, 'id');

                var _compare = function (ai, bi) {
                    if (!ai && !bi) return 0;
                    if (!ai) return 1;
                    if (!bi) return -1;

                    var level_a = ai.level || 0;
                    var level_b = bi.level || 0;
                    var r;

                    /*console.log("COMPARE");
                    console.log(ai);
                    console.log(level_a);
                    console.log(bi);
                    console.log(level_b);*/

                    if (level_a != level_b) {
                        if (ai.id == bi.parent_id) {
                            //console.log("a is parent");
                            r = -1;
                        } else if (bi.id == ai.parent_id) {
                            //console.log("b is parent");
                            r = 1;
                        } else {
                            r = level_a > level_b ? _compare(itemsById[ai.parent_id], bi) : _compare(ai, itemsById[bi.parent_id]);
                        }

                        //console.log("diff level => " + r);
                        return r;
                    }
                    if (ai.parent_id != bi.parent_id) {
                        r = _compare(itemsById[ai.parent_id], itemsById[bi.parent_id]);
                        //console.log("diff parent => " + r);
                        return r;
                    }

                    r = sortFn(ai, bi);
                    //console.log("same folder => " + r);
                    if (r === 0) r = fallbackSortFn(ai, bi);
                    return r;
                };

                return list.sort(_compare);
            }
        };
    });
