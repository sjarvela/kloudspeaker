require.config({
    //enforceDefine: true,
    shim: {
        'bootstrap': {
            deps: ['jquery'],
            exports: 'jQuery'
        }
    }
});
define('jquery', [], function() {
    return $;
});
define('knockout', [], ko);
