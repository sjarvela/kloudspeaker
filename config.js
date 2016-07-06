System.config({
  defaultJSExtensions: true,
  transpiler: "babel",
  babelOptions: {
    "optional": [
      "es7.decorators",
      "es7.classProperties"
    ]
  },
  paths: {
    "*": "src/*",
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*",
    "dist": "dist/",
    "app-config": "app-config"
  },

  map: {
    "aurelia-animator-css": "npm:aurelia-animator-css@1.0.0-rc.1.0.0",
    "aurelia-bootstrapper": "npm:aurelia-bootstrapper@1.0.0-rc.1.0.1",
    "aurelia-dialog": "npm:aurelia-dialog@0.5.10",
    "aurelia-event-aggregator": "npm:aurelia-event-aggregator@1.0.0-rc.1.0.0",
    "aurelia-fetch-client": "npm:aurelia-fetch-client@1.0.0-rc.1.0.0",
    "aurelia-framework": "npm:aurelia-framework@1.0.0-rc.1.0.1",
    "aurelia-history-browser": "npm:aurelia-history-browser@1.0.0-rc.1.0.0",
    "aurelia-i18n": "npm:aurelia-i18n@1.0.0-rc.1.0.0",
    "aurelia-loader-default": "npm:aurelia-loader-default@1.0.0-rc.1.0.0",
    "aurelia-logging-console": "npm:aurelia-logging-console@1.0.0-rc.1.0.0",
    "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
    "aurelia-router": "npm:aurelia-router@1.0.0-rc.1.0.0",
    "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0",
    "aurelia-templating-binding": "npm:aurelia-templating-binding@1.0.0-rc.1.0.0",
    "aurelia-templating-resources": "npm:aurelia-templating-resources@1.0.0-rc.1.0.0",
    "aurelia-templating-router": "npm:aurelia-templating-router@1.0.0-rc.1.0.0",
    "babel": "npm:babel-core@5.8.38",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "bootstrap": "github:twbs/bootstrap@4.0.0-alpha.2",
    "clean-css": "npm:clean-css@3.4.18",
    "cookies": "npm:cookies-js@1.2.2",
    "core-js": "npm:core-js@1.2.6",
    "datepicker": "github:eternicode/bootstrap-datepicker@1.6.1",
    "fetch": "github:github/fetch@0.11.1",
    "font-awesome": "npm:font-awesome@4.6.3",
    "i18next": "npm:i18next@2.5.1",
    "i18next-xhr-backend": "npm:i18next-xhr-backend@0.6.0",
    "jquery": "github:components/jquery@2.2.1",
    "moment": "npm:moment@2.13.0",
    "requirejs": "npm:requirejs@2.2.0",
    "text": "github:systemjs/plugin-text@0.0.4",
    "underscore": "npm:underscore@1.8.3",
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.4.1"
    },
    "github:jspm/nodelibs-buffer@0.1.0": {
      "buffer": "npm:buffer@3.6.0"
    },
    "github:jspm/nodelibs-events@0.1.1": {
      "events": "npm:events@1.0.2"
    },
    "github:jspm/nodelibs-http@1.7.1": {
      "Base64": "npm:Base64@0.2.1",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "url": "github:jspm/nodelibs-url@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "github:jspm/nodelibs-https@0.1.0": {
      "https-browserify": "npm:https-browserify@0.0.0"
    },
    "github:jspm/nodelibs-os@0.1.0": {
      "os-browserify": "npm:os-browserify@0.1.2"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.5"
    },
    "github:jspm/nodelibs-stream@0.1.0": {
      "stream-browserify": "npm:stream-browserify@1.0.0"
    },
    "github:jspm/nodelibs-url@0.1.0": {
      "url": "npm:url@0.10.3"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "github:jspm/nodelibs-vm@0.1.0": {
      "vm-browserify": "npm:vm-browserify@0.0.4"
    },
    "github:twbs/bootstrap@4.0.0-alpha.2": {
      "jquery": "npm:jquery@2.2.4",
      "tether": "github:HubSpot/tether@1.3.2"
    },
    "npm:amdefine@1.0.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "module": "github:jspm/nodelibs-module@0.1.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:assert@1.4.1": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "util": "npm:util@0.10.3"
    },
    "npm:aurelia-animator-css@1.0.0-rc.1.0.0": {
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-binding@1.0.0-rc.1.0.2": {
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-task-queue": "npm:aurelia-task-queue@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-bootstrapper@1.0.0-rc.1.0.1": {
      "aurelia-event-aggregator": "npm:aurelia-event-aggregator@1.0.0-rc.1.0.0",
      "aurelia-framework": "npm:aurelia-framework@1.0.0-rc.1.0.1",
      "aurelia-history": "npm:aurelia-history@1.0.0-rc.1.0.0",
      "aurelia-history-browser": "npm:aurelia-history-browser@1.0.0-rc.1.0.0",
      "aurelia-loader-default": "npm:aurelia-loader-default@1.0.0-rc.1.0.0",
      "aurelia-logging-console": "npm:aurelia-logging-console@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-pal-browser": "npm:aurelia-pal-browser@1.0.0-rc.1.0.0",
      "aurelia-polyfills": "npm:aurelia-polyfills@1.0.0-rc.1.0.0",
      "aurelia-router": "npm:aurelia-router@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0",
      "aurelia-templating-binding": "npm:aurelia-templating-binding@1.0.0-rc.1.0.0",
      "aurelia-templating-resources": "npm:aurelia-templating-resources@1.0.0-rc.1.0.0",
      "aurelia-templating-router": "npm:aurelia-templating-router@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0": {
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-dialog@0.5.10": {
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-event-aggregator@1.0.0-rc.1.0.0": {
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-framework@1.0.0-rc.1.0.1": {
      "aurelia-binding": "npm:aurelia-binding@1.0.0-rc.1.0.2",
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-loader": "npm:aurelia-loader@1.0.0-rc.1.0.0",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0",
      "aurelia-task-queue": "npm:aurelia-task-queue@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-history-browser@1.0.0-rc.1.0.0": {
      "aurelia-history": "npm:aurelia-history@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-i18n@1.0.0-rc.1.0.0": {
      "aurelia-binding": "npm:aurelia-binding@1.0.0-rc.1.0.2",
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-event-aggregator": "npm:aurelia-event-aggregator@1.0.0-rc.1.0.0",
      "aurelia-loader": "npm:aurelia-loader@1.0.0-rc.1.0.0",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0",
      "aurelia-templating-resources": "npm:aurelia-templating-resources@1.0.0-rc.1.0.0",
      "i18next": "npm:i18next@3.3.1",
      "intl": "npm:intl@1.2.4"
    },
    "npm:aurelia-loader-default@1.0.0-rc.1.0.0": {
      "aurelia-loader": "npm:aurelia-loader@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-loader@1.0.0-rc.1.0.0": {
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-logging-console@1.0.0-rc.1.0.0": {
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-metadata@1.0.0-rc.1.0.0": {
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-pal-browser@1.0.0-rc.1.0.0": {
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-polyfills@1.0.0-rc.1.0.0": {
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-route-recognizer@1.0.0-rc.1.0.0": {
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-router@1.0.0-rc.1.0.0": {
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-event-aggregator": "npm:aurelia-event-aggregator@1.0.0-rc.1.0.0",
      "aurelia-history": "npm:aurelia-history@1.0.0-rc.1.0.0",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0",
      "aurelia-route-recognizer": "npm:aurelia-route-recognizer@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-task-queue@1.0.0-rc.1.0.0": {
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-templating-binding@1.0.0-rc.1.0.0": {
      "aurelia-binding": "npm:aurelia-binding@1.0.0-rc.1.0.2",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-templating-resources@1.0.0-rc.1.0.0": {
      "aurelia-binding": "npm:aurelia-binding@1.0.0-rc.1.0.2",
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-loader": "npm:aurelia-loader@1.0.0-rc.1.0.0",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0",
      "aurelia-task-queue": "npm:aurelia-task-queue@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-templating-router@1.0.0-rc.1.0.0": {
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0",
      "aurelia-router": "npm:aurelia-router@1.0.0-rc.1.0.0",
      "aurelia-templating": "npm:aurelia-templating@1.0.0-rc.1.0.0"
    },
    "npm:aurelia-templating@1.0.0-rc.1.0.0": {
      "aurelia-binding": "npm:aurelia-binding@1.0.0-rc.1.0.2",
      "aurelia-dependency-injection": "npm:aurelia-dependency-injection@1.0.0-rc.1.0.0",
      "aurelia-loader": "npm:aurelia-loader@1.0.0-rc.1.0.0",
      "aurelia-logging": "npm:aurelia-logging@1.0.0-rc.1.0.0",
      "aurelia-metadata": "npm:aurelia-metadata@1.0.0-rc.1.0.0",
      "aurelia-pal": "npm:aurelia-pal@1.0.0-rc.1.0.0",
      "aurelia-path": "npm:aurelia-path@1.0.0-rc.1.0.0",
      "aurelia-task-queue": "npm:aurelia-task-queue@1.0.0-rc.1.0.0"
    },
    "npm:babel-runtime@5.8.38": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:buffer@3.6.0": {
      "base64-js": "npm:base64-js@0.0.8",
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "ieee754": "npm:ieee754@1.1.6",
      "isarray": "npm:isarray@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:clean-css@3.4.18": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "commander": "npm:commander@2.8.1",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "http": "github:jspm/nodelibs-http@1.7.1",
      "https": "github:jspm/nodelibs-https@0.1.0",
      "os": "github:jspm/nodelibs-os@0.1.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "source-map": "npm:source-map@0.4.4",
      "url": "github:jspm/nodelibs-url@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:commander@2.8.1": {
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "graceful-readlink": "npm:graceful-readlink@1.0.1",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:core-js@1.2.6": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:core-util-is@1.0.2": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:font-awesome@4.6.3": {
      "css": "github:systemjs/plugin-css@0.1.23"
    },
    "npm:graceful-readlink@1.0.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2"
    },
    "npm:https-browserify@0.0.0": {
      "http": "github:jspm/nodelibs-http@1.7.1"
    },
    "npm:i18next@2.5.1": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:i18next@3.3.1": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:intl@1.2.4": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:os-browserify@0.1.2": {
      "os": "github:jspm/nodelibs-os@0.1.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:process@0.11.5": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:punycode@1.3.2": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:readable-stream@1.1.14": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "core-util-is": "npm:core-util-is@1.0.2",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "isarray": "npm:isarray@0.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream-browserify": "npm:stream-browserify@1.0.0",
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "npm:requirejs@2.2.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:source-map@0.4.4": {
      "amdefine": "npm:amdefine@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:stream-browserify@1.0.0": {
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "readable-stream": "npm:readable-stream@1.1.14"
    },
    "npm:string_decoder@0.10.31": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:url@0.10.3": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "punycode": "npm:punycode@1.3.2",
      "querystring": "npm:querystring@0.2.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:vm-browserify@0.0.4": {
      "indexof": "npm:indexof@0.0.1"
    }
  }
});
