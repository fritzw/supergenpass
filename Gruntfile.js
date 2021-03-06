/*
 * SuperGenPass
 * http://supergenpass.com/
 */

module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: ['js/sgp*.js']
    },

    uglify: {
      components: {
        files: {
          'build/components.min.js': [
            'bower_components/jquery/jquery.js',
            'bower_components/jstorage/jstorage.js',
            'js/jquery.identicon5.js'
          ]
        }
      },
      app: {
        files: {
          'build/app.min.js': [
            'js/sgp.hash.js',
            'js/sgp.core.js',
            'js/sgp.form.js'
          ]
        }
      },
      bookmarklet: {
        files: {
          'build/sgp.js': ['js/sgp.js']
        }
      }
    },

    cssmin: {
      add_banner: {
        files: {
          'build/app.min.css': [
            'app/app.css'
          ]
        }
      }
    },

    compile: {
      app: {
        options: {
          include: {
            lib: 'build/components.min.js',
            js: 'build/app.min.js',
            css: 'build/app.min.css'
          }
        },
        files: {
          'build/index.html': ['app/index.html']
        }
      },
      bookmarklet: {
        options: {
          bookmarklet: true
        },
        files: {
          'build/sgp.bookmarklet.js': ['build/sgp.js']
        }
      }
    },

    manifest: {
      generate: {
        options: {
          basePath: 'build/',
          network: ['*'],
          verbose: true,
          timestamp: true
        },
        src: [
          'index.html'
        ],
        dest: 'build/cache.manifest'
      }
    },

    checksum: {
      app: {
        options: {
          algorithm: 'sha512'
        },
        files: {
          'build/checksums.json': ['build/index.html', 'build/sgp.bookmarklet.js']
        }
      }
    }

  }),

  // Load tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-manifest');

  grunt.registerMultiTask('compile', 'Generate self-contained HTML5 app', function() {

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      bookmarklet: false,
      include: {},
    }),

    // File exists helper.
    fileExists = function(filepath) {
      if(grunt.file.exists(filepath)) {
        return true;
      } else {
        grunt.log.warn('Source file "' + filepath + '" not found.');
        return false;
      }
    },

    // Read file helper.
    readFile = function(filepath) {
      // Read and return the file's source.
      return grunt.file.read(filepath);
    };

    // Load include files into include object.
    Object.keys(options.include).forEach(function(key) {
      var filepath = options.include[key];
      if(fileExists(filepath)) {
        options.include[key] = readFile(filepath)
      } else {
        delete options.include[key];
      }
    });

    this.files.forEach(function(file) {

      // Load files.
      var contents = file.src.map(readFile).join('');

      // Process as template.
      contents = grunt.template.process(contents, {data:options.include});

      if(options.bookmarklet) {

        // Wrap in anonymous function.
        contents = '(function(){' + contents + '})()';

        // Encode as URI.
        contents = encodeURI('javascript:' + contents);

      }

      // Write joined contents to destination filepath.
      grunt.file.write(file.dest, contents);
      grunt.log.writeln('Compiled file: ' + file.dest);

    });

  });

  grunt.registerMultiTask('checksum', 'Generate checksums', function() {

    var done = this.async(),
    crypto = require('crypto'),
    fs = require('fs'),

    // Merge task-specific and/or target-specific options with these defaults.
    options = this.options({
      algorithm: 'sha-512',
    }),

    // Placeholder for checksums.
    result = {},

    // Task counter.
    tasks = this.files.length,

    // Generate checksum.
    checkSum = function(filepath, dest) {
      var shasum = crypto.createHash(options.algorithm),
      stream = fs.ReadStream(filepath);
      stream.on('data', function(data) {
        shasum.update(data);
      });
      stream.on('end', function() {
        var sum = shasum.digest('hex');
        writeSum(filepath, dest, sum);
      });
    },

    // Write to checksum file.
    writeSum = function(src, dest, sum) {
      result[dest].sums[src] = sum;
      if(Object.keys(result[dest].sums).length === result[dest].count) {
        grunt.file.write(dest, JSON.stringify(result[dest].sums));
        grunt.log.writeln('Generated checksum file: ' + dest);
        if(!--tasks) {
          done();
        }
      }
    };

    // Process files.
    this.files.forEach(function(file) {

      // Stash checksum destination in scope.
      var dest = file.dest;

      // Create a placeholder record for this checksum task.
      result[dest] = {
        count: file.src.length,
        sums: {}
      };

      // Loop through each source file.
      file.src.forEach(function(src) {
        checkSum(src, dest);
      });

    });

  });

  grunt.registerTask('default', ['jshint', 'uglify', 'cssmin', 'compile', 'manifest', 'checksum']);
  grunt.registerTask('build', ['jshint', 'uglify:app', 'cssmin', 'compile:app', 'manifest', 'checksum']);
  grunt.registerTask('bookmarklet', ['jshint', 'uglify:bookmarklet', 'compile:bookmarklet']);
  grunt.registerTask('components', ['uglify:components']);
  grunt.registerTask('css', ['cssmin']);

};
