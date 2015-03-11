/*!
 * Mollify Gruntfile
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

module.exports = function(grunt) {
    'use strict';

    // Force use of Unix newlines
    grunt.util.linefeed = '\n';

    RegExp.quote = function(string) {
        return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    var pkg = grunt.file.readJSON('package.json');

    // Project configuration.
    grunt.initConfig({

        // Metadata.
        pkg: pkg,
        banner: '/*!\n' + ' * Mollify v<%= pkg.version %> (<%= pkg.homepage %>)\n' + ' * Copyright 2008-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' + ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n' + ' */\n',

        // Task configuration.
        clean: {
            dist: 'dist'
        },

        jshint: {
            options: {
                jshintrc: 'js/.jshintrc'
            },
            grunt: {
                src: [] //TODO clean up 'Gruntfile.js']
            },
            src: {
                src: 'js/*.js'
            },
            test: {
                src: [] //'js/tests/unit/*.js'
            },
            assets: {
                src: []
            }
        },

        jscs: {
            options: {
                config: 'js/.jscs.json',
            },
            grunt: {
                src: [] //'Gruntfile.js']
            },
            src: {
                src: [] //TODO clean 'js/*.js'
            },
            test: {
                src: [] //'js/tests/unit/*.js'
            },
            assets: {
                src: []
            }
        },

        concat: {
            options: {
                banner: '<%= banner %>\n',
                stripBanners: false
            },
            mollify: {
                src: [
                    'js/init.js',
                    'js/ui.js',
                    'js/loginview.js',
                    'js/mainview.js',
                    'js/plugins.js',
                    'js/configview.js',
                    'js/uploader.js'
                ],
                dest: 'dist/js/<%= pkg.name %>.js'
            },
            full: {
                src: [
                    'js/lib/jquery.min.js',
                    'js/lib/json.js',
                    'js/lib/jquery.tmpl.min.js',
                    'js/lib/jquery-ui.js',
                    'js/lib/bootstrap.js',
                    'js/lib/bootstrap-datetimepicker.js',
                    'js/lib/bootstrap-lightbox.js',
                    'js/lib/modernizr.js',
                    'js/lib/date.js',
                    'js/lib/jquery-file-uploader.js',
                    'js/lib/jquery-singledoubleclick.js',
                    'js/lib/ZeroClipboard.js',

                    'dist/js/<%= pkg.name %>.js',
                ],
                dest: 'dist/js/<%= pkg.name %>.full.js'
            },
            css: {
                src: [
                    'css/libs.css',
                    'css/bootstrap.css',
                    'css/bootstrap-responsive.css',
                    'css/font-awesome.css',
                    'css/bootstrap-lightbox.css',
                    'css/bootstrap-datetimepicker.min.css',
                    'css/style.css'
                ],
                dest: 'dist/css/<%= pkg.name %>.css'
            }
        },

        uglify: {
            mollify: {
                options: {
                    banner: '<%= banner %>',
                    report: 'min'
                },
                files: [{
                    src: 'dist/js/mollify.js',
                    dest: 'dist/js/mollify.min.js'
                }, {
                    src: 'dist/js/mollify.full.js',
                    dest: 'dist/js/mollify.full.min.js'
                }]
            }
        },

        cssmin: {
            minify: {
                options: {
                    keepSpecialComments: '*',
                    noAdvanced: true, // turn advanced optimizations off until the issue is fixed in clean-css
                    report: 'min',
                    selectorsMergeMode: 'ie8'
                },
                files: {
                    'dist/css/<%= pkg.name %>.min.css': ['dist/css/<%= pkg.name %>.css']
                }
            }
            /*,
      compress: {
        options: {
          keepSpecialComments: '*',
          noAdvanced: true, // turn advanced optimizations off until the issue is fixed in clean-css
          report: 'min',
          selectorsMergeMode: 'ie8'
        },
        src: [
          'dist/css/<%= pkg.name %>.css'
        ],
        dest: 'dist/css/<%= pkg.name %>.min.css'
      }*/
        },

        usebanner: {
            dist: {
                options: {
                    position: 'top',
                    banner: '<%= banner %>'
                },
                files: {
                    src: [
                        'dist/css/<%= pkg.name %>.css',
                        'dist/css/<%= pkg.name %>.min.css'
                    ]
                }
            }
        },

        copy: {
            css: {
                expand: true,
                src: ['css/font/**', 'css/images/**'],
                dest: 'dist/'
            },
            js: {
                expand: true,
                src: ['js/lib/*', 'templates/**', 'localization/**'],
                dest: 'dist/'
            },
            backend: {
                expand: true,
                src: [
                    'backend/**',
                    '!backend/dav/**',
                    '!backend/configuration.php',
                    '!backend/*.db',
                    '!backend/plugin/S3/**',
                    '!backend/plugin/FileViewerEditor/viewers/FlowPlayer/**',
                    '!backend/plugin/FileViewerEditor/viewers/JPlayer/**',
                    '!backend/plugin/FileViewerEditor/viewers/TextFile/**',
                    '!backend/plugin/FileViewerEditor/viewers/FlexPaper/**',
                    '!backend/plugin/FileViewerEditor/editors/CKEditor/**',
                    '!backend/plugin/SendViaEmail/**'
                ],
                dest: 'dist/'
            },
            dist: {
                files: [{
                    src: 'backend/example/example_index.html',
                    dest: 'dist/index.html'
                }]
            },
            dist_ver: {
                src: 'backend/include/Version.info.php',
                dest: 'dist/backend/include/Version.info.php',
                options: {
                    process: function(content, srcpath) {
                        return "<?php $VERSION=\"" + pkg.version + "\"; $REVISION=" + pkg.revision + "; ?>";
                    }
                }
            },
            dav: {
                files: [{
                    expand: true,
                    cwd: 'backend/',
                    src: 'dav/**',
                    dest: 'dist/'
                }, {
                    expand: true,
                    cwd: 'backend/',
                    src: 'dav/.htaccess',
                    dest: 'dist/'
                }]
            }
        },

        compress: {
            dist: {
                options: {
                    archive: 'dist/<%= pkg.name %>_<%= pkg.version %>.zip'
                },
                files: [{
                    expand: true,
                    cwd: 'dist/',
                    src: ['**', '!<%= pkg.name %>_<%= pkg.version %>.zip'],
                    dest: 'mollify/'
                }]
            },
            dav: {
                options: {
                    archive: 'dist/mollify_webdav.zip'
                },
                files: [{
                    expand: true,
                    cwd: 'dist/dav/',
                    src: ['**', '.htaccess'],
                    dest: 'dav/'
                }]
            }
        },

        qunit: {
            options: {
                inject: 'js/tests/unit/phantom.js'
            },
            files: 'js/tests/*.html'
        },

        phpunit: {
            classes: {
                dir: 'backend/test/'
            },
            options: {
                bin: 'vendor/bin/phpunit',
                //bootstrap: 'tests/php/phpunit.php',
                colors: true
            }
        }

    });


    // These plugins provide necessary tasks.
    require('load-grunt-tasks')(grunt, {
        scope: 'devDependencies'
    });

    grunt.registerTask('test', ['jshint', 'jscs', 'qunit', 'phpunit']);

    // JS distribution task.
    grunt.registerTask('dist-js', ['concat', 'uglify', 'copy:js']);

    // CSS distribution task.
    grunt.registerTask('dist-css', ['concat:css', 'cssmin', 'usebanner', 'copy:css']);

    // JS distribution task.
    grunt.registerTask('dist-backend', ['copy:backend']);

    // WebDAV
    grunt.registerTask('dist-dav', ['clean', 'copy:dav', 'compress:dav']);

    // Full distribution task.
    grunt.registerTask('dist', ['clean', 'dist-js', 'dist-css', 'dist-backend', 'copy:dist', 'copy:dist_ver', 'compress:dist']);

    // Default task.
    grunt.registerTask('default', ['dist']);

    // Version numbering task.
    // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
    // This can be overzealous, so its changes should always be manually reviewed!
    //grunt.registerTask('change-version-number', 'sed');
};
