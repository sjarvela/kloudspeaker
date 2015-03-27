requirejs.config({
    baseUrl: "client/app",
    paths: {
        'text': '../../bower_components/requirejs-text/text',
        'durandal': '../../bower_components/durandal/js',
        'plugins': '../../bower_components/durandal/js/plugins',
        'transitions': '../../bower_components/durandal/js/transitions',
        'knockout': '../../bower_components/knockout.js/knockout',
        'jquery': '../../bower_components/jquery/jquery',
        'bootstrap': '../../bower_components/bootstrap/dist/js/bootstrap',
        'underscore': '../../bower_components/underscore/underscore',
        //'knockout-bootstrap': '../vendor/knockout-bootstrap',
        'jquery-singledoubleclick': '../vendor/jquery-singledoubleclick',
        'i18next': '../../bower_components/i18next/i18next.amd.withJQuery',
        'moment': '../../bower_components/moment/moment',
        'knockstrap': '../../bower_components/knockstrap/build/knockstrap',
    },
    shim: {
        'bootstrap': {
            deps: ['jquery'],
            exports: 'jQuery'
        }
    }
});