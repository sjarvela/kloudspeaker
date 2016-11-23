define(['kloudspeaker/core/file-sort'], function(fileSort) {
    'use strict';

    var list_same_level = [
        { id: '1', index: 0, level: 0 },
        { id: '4', index: 4, level: 0 },
        { id: '5', index: 5, level: 0 },
        { id: '2', index: 2, level: 0 },
        { id: '3', index: 3, level: 0 }
    ];
    var list_two_levels = [
        { id: '1', index: 0, level: 0 },
        { id: '2', index: 0, level: 0 },
        { id: '3', index: 2, level: 0 },
        { id: '1_1', index: 0, level: 1, parent_id: '1' },
        { id: '1_2', index: 1, level: 1, parent_id: '1' }
    ];
    var list_two_levels_2 = [
        { id: '1', index: 0, level: 0 },
        { id: '2', index: 0, level: 0 },
        { id: '3', index: 2, level: 0 },
        { id: '1_1', index: 0, level: 1, parent_id: '1' },
        { id: '1_2', index: 1, level: 1, parent_id: '1' },
        { id: '2_1', index: 0, level: 1, parent_id: '2' },
        { id: '2_2', index: 1, level: 1, parent_id: '2' }
    ];

    beforeEach(function() {});

    describe('File sort', function() {
        it('should sort same level', function() {
            expect(sort(list_same_level, 'index')).to.eql("1,2,3,4,5");
        });
        it('should sort same level reverse', function() {
            expect(sort(list_same_level, 'index', true)).to.eql("5,4,3,2,1");
        });
        it('should sort two levels', function() {
            expect(sort(list_two_levels, 'index')).to.eql("1,1_1,1_2,2,3");
        });
        it('should sort two levels reverse', function() {
            expect(sort(list_two_levels, 'index', true)).to.eql("3,2,1,1_2,1_1");
        });
        it('should sort two levels 2', function() {
            expect(sort(list_two_levels_2, 'index')).to.eql("1,1_1,1_2,2,2_1,2_2,3");
        });
        it('should sort two levels 2 reverse', function() {
            expect(sort(list_two_levels_2, 'index', true)).to.eql("3,2,2_2,2_1,1,1_2,1_1");
        });
    });

    // UTILITIES

    var _getPropertySortFn = function(key, reverse){
        return function(a, b) {
            var av = a[key];
            var bv = b[key];
            if (_.isString(av))
                return av.localeCompare(bv) * (reverse ? -1 : 1);
            return (av > bv ? 1 : (av < bv ? -1 : 0)) * (reverse ? -1 : 1);
        };
    }
    var _ids = function(l) {
        return _.map(l, function(i) { return i.id; }).join(',');
    }
    var sort = function(list, key, reverse) {
        return _ids(fileSort.sort(list, _getPropertySortFn(key, reverse), _getPropertySortFn('id', reverse)));
    }
});