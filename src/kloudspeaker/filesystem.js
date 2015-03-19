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
                return service.post("filesystem/" + folderId + "/info/", {
                    data: data,
                    children: true,
                    hierarchy: true,
                    permissions: true
                }).pipe(function(r) {
                    permissions.putFilesystemPermissions(folderId, r.permissions);

                    //var folder = r.folder;
                    var data = r;
                    data.items = r.children;
                    return data;
                });
            },
            itemInfo: function(itemId, data) {
                return service.post("filesystem/" + itemId + "/info/", {
                    data: data,
                    permissions: true,
                    details: true
                }).pipe(function(r) {
                    permissions.putFilesystemPermissions(itemId, r.permissions);
                    return r;
                });
            }
        };
    }
);
