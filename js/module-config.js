require.config({
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
