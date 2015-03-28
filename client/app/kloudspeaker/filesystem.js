define(['kloudspeaker/core_service', 'kloudspeaker/permissions', 'durandal/app'],
    function(service, permissions, da) {
        var _roots = [];
        var _rootsById = [];
        da.on('session:start').then(function(session) {
            _roots = session.folders ? session.folders : [];
            $.each(_roots, function(i, r) {
                _rootsById[r.id] = r;
            })
        });
        da.on('session:end').then(function(session) {
            _roots = [];
            _rootsById = {};
        });

        return {
            canCopyTo: function(item, to) {
                if (window.isArray(item)) {
                    for (var i = 0, j = item.length; i < j; i++)
                        if (!mfs.canCopyTo(item[i], to)) return false;
                    return true;
                }

                // cannot copy into file
                if (to.is_file) return false;

                // cannot copy into itself
                if (item.id == to.id) return false;

                // cannot copy into same location
                if (item.parent_id == to.id) return false;
                return true;
            },

            canMoveTo: function(item, to) {
                if (window.isArray(item)) {
                    for (var i = 0, j = item.length; i < j; i++)
                        if (!mfs.canMoveTo(item[i], to)) return false;
                    return true;
                }

                // cannot move into file
                if (to.is_file) return false;

                // cannot move folder into its own subfolder
                if (!to.is_file && item.root_id == to.root_id && to.path.startsWith(item.path)) return false;

                // cannot move into itself
                if (item.id == to.id) return false;

                // cannot move into same location
                if (item.parent_id == to.id) return false;
                return true;
            },

            roots: function() {
                return _roots;
            },
            root: function(id) {
                return _rootsById[id];
            },
            rootsById: function() {
                return _rootsById;
            },
            folderInfo: function(folderId, data) {
                return service.post("filesystem/" + folderId + "/info/?h=1", { //TODO remove "h=1" when rewriting backend
                    data: data,
                    children: true,
                    hierarchy: true,
                    permissions: true
                }).pipe(function(r) {
                    permissions.putFilesystemPermissions(folderId, r.permissions);

                    var data = r;
                    //data.items = r.children;
                    return data;
                });
            },
            itemInfo: function(itemId, data) {
                return service.post("filesystem/" + itemId + "/details/", { //TODO details -> info when rewriting backend
                    data: data,
                    permissions: true,
                    details: true
                }).pipe(function(r) {
                    permissions.putFilesystemPermissions(itemId, r.permissions);
                    return r;
                });
            },
            setItemDescription: function(item, description) {
                return service.put("filesystem/" + item.id + "/description/", {
                    description: description
                });
            },
            copy: function(itm, to) {
                //TODO
            },
            move: function(itm, to) {
                //TODO
            }
        };
    }
);
