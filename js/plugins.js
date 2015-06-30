/**
 * plugins.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

! function($, kloudspeaker) {

    "use strict";

    kloudspeaker.plugin = {
        conf: {}
    };

    /**
    /* Item details plugin
    /**/
    kloudspeaker.plugin.ItemDetailsPlugin = function(conf) {
        //if (console && console.log) console.log("KLOUDSPEAKER DEPRECATION: Item details plugin should not be registered explicitly");
        if (conf) kloudspeaker.plugin.conf.itemdetails = {
            filetypes: conf
        };
        return {
            deprecated: true
        };
    }

    /**
     *  Item collection plugin
     **/
    kloudspeaker.plugin.ItemCollectionPlugin = function() {
        return {
            deprecated: true
        }
    }

    /**
     *  Archiver plugin
     **/
    kloudspeaker.plugin.ArchiverPlugin = function() {
        return {
            deprecated: true
        }
    }

    /**
    /* File viewer editor plugin
    /**/
    kloudspeaker.plugin.FileViewerEditorPlugin = function() {
        return {
            deprecated: true
        }
    };

    /**
     *  Comment plugin
     **/
    kloudspeaker.plugin.CommentPlugin = function() {
        return {
            deprecated: true
        };
    }

    /**
     *  Dropbox plugin
     **/
    kloudspeaker.plugin.DropboxPlugin = function() {
        return {
            deprecated: true
        };
    }

    /**
     *  Share plugin
     **/
    kloudspeaker.plugin.SharePlugin = function() {
        return {
            deprecated: true
        };
    }

    /**
     *  Registration -plugin published as AMD module
     **/
    kloudspeaker.plugin.RegistrationPlugin = function() {
        return {
            deprecated: true
        };
    }
}(window.jQuery, window.kloudspeaker);
