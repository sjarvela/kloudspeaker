export var app_config = {
    service: {
        url: 'backend/'
    },
    plugins: {
        "plugin-history": {
            //menu: false
        },
        "itemdetails": {
            filetypes: {
                "jpg,tiff": {
                    "metadata-created": {},
                    "metadata-modified": {},
                    "size": {},
                    "image-size": {},
                    "exif": {},
                },
                "*": {
                    "metadata-created": {},
                    "metadata-modified": {},
                    "size": {},
                }
            }
        }
    }
}
