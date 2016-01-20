/// <binding BeforeBuild='injector, ts:build' ProjectOpened='watch' />
module.exports = function(grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg : grunt.file.readJSON('package.json'),
		nodemon : {
			dev : {
				script : 'launcher.js'
			},
			options : {
				ignore : ['node_modules/**', 'Gruntfile.js'],
                nodeArgs: ['--debug'],
				env : {
					PORT : '4123'
				}
			}
		},

		//less: {
	 //     development: {
	 //       options: {
	 //         compress: true,
	 //         yuicompress: true,
	 //         optimization: 2
	 //       },
	 //       files: {
	 //         "client/vendors/bootstrap/dist/css/bootstrap.css": "client/mc-theme/bootstrap.less" // destination file and source file
	 //       }
	 //     }
	 //   },
        watch : {
			scripts : {
				files : ['**/*.ts', '!node_modules/**/*.ts', '!client/**/*.*'], // the watched files
				// tasks : ["newer:tslint:all", "ts:build"], // the task to run
				tasks : ['ts:build', 'injector'], // the task to run
				options : {
					spawn : false // makes the watch task faster
				}
			}
		},
		watchBackend : {
			scripts : {
				files : ['**/*.ts', '!node_modules/**/*.ts', '!client/**/*.*'], // the watched files
				// tasks : ["newer:tslint:all", "ts:build"], // the task to run
				tasks : ['ts:buildBackend', 'injector'], // the task to run
				options : {
					spawn : false // makes the watch task faster
				}
			}
		},
        watchFrontend : {
			scripts : {
				files : ['client/**/*.ts', '!client/vendors/**/*.*'], // the watched files
				tasks : ['ts:buildFrontend'], // the task to run
				options : {
					spawn : false // makes the watch task faster
				}
			}
		},
		concurrent : {
			watchers : {
				tasks : ['nodemon', 'watch', 'ts:build'],
				options : {
					logConcurrentOutput : true
				}
			}
		},

		// tslint : {
			// options : {
				// configuration : grunt.file.readJSON("tslint.json")
			// },
			// all : {
				// src : ["**/*.ts", "!node_modules/**/*.ts", "!obj/**/*.ts", "!typings/**/*.ts"]// avoid linting typings files and node_modules files
			// }
		// },
		ts : {
			build : {
				src : ["**/*.ts", "!node_modules/**/*.ts"], // Avoid compiling TypeScript files in node_modules
				options : {
					module : 'commonjs', // To compile TypeScript using external modules like NodeJS
					fast : 'never' // You'll need to recompile all the files each time for NodeJS
				}
			},
            buildBackend : {
				src : ["**/*.ts", "!node_modules/**/*.ts", "!client/**/*.*"], // Avoid compiling TypeScript files in node_modules
				options : {
					module : 'commonjs', // To compile TypeScript using external modules like NodeJS
					fast : 'never' // You'll need to recompile all the files each time for NodeJS
				}
			},
            buildFrontend : {
				src : ["client/**/*.ts", "!client/vendors/**/*.ts"], // Avoid compiling TypeScript files in node_modules
				options : {
					module : 'commonjs', // To compile TypeScript using external modules like NodeJS
					fast : 'never' // You'll need to recompile all the files each time for NodeJS
				}
			}
		},
		wiredep: {
			task: {
				options: {
					cwd: 'client'
				},
				src: [
					"client/index.html"
				]
			}
		},
		injector: {
			options: {
				ignorePath: "client",
				addRootSlash: false
			},
			local_dependencies: {
				files: {
					"client/index.html": [
						"client/js/**/*.module.js",
						"client/js/models.js",
						"client/js/services.js",
						"client/js/controllers.js",
						"client/js/app.routes.js",
						"client/js/app.js",
						"client/js/**/*controller.js",
						"client/js/**/*.js", 
						"!**/*.spec.js",
						// "!client/js/sellers/seller-signup.controller.js",
						"!js/sellers/seller-list.controller.js"
					]
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-nodemon");
	grunt.loadNpmTasks("grunt-concurrent");
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-wiredep');
	grunt.loadNpmTasks('grunt-injector');

	// Default tasks.
	grunt.registerTask("serve", ["concurrent:watchers"]);
	// tslint disabled for now, gives 'Warning: Task "tslint:all" not found. Use --force to continue.'
	// Even with latest tslint.
	// grunt.registerTask('default', ["tslint:all", "ts:build"]);
	grunt.registerTask('default', ['ts:build', 'wiredep', 'injector']);
};
