"use strict";

module.exports = function(grunt) {
    
    // Configuration
    grunt.initConfig({
        
        name: "uniator",
        mainFile: "uniator",
        
        srcDir: "src",
        srcFiles: "**/*.js",
        src: "<%= srcDir %>/<%= srcFiles %>",
        
        destDir: "dist",
        
        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            gruntfile: {
                src: "Gruntfile.js"
            },
            src: {
                src: ["<%= src %>"]
            },
            test: {
                src: ["test/*.js"]
            }
        },
        
        
        jsdoc: {
            dist: {
                src: ["<%= src %>", "README.md"],
                options: {
                    destination: "doc",
                    template: "node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
                    configure: "jsdoc-conf.json"
                }
            }
        },
        
        
        mochacli: {
            all: {}
        }
        
        
        
    });
    
    // Plugins
    grunt.loadNpmTasks("grunt-contrib-jshint");
    
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks("grunt-mocha-cli");
    
    // Tasks
    
    grunt.registerTask("doc", ["jsdoc"]);
    grunt.registerTask("test", ["mochacli"]);
    grunt.registerTask("default", ["jshint", "test"]);
    grunt.registerTask("all", ["default", "doc"]);
    
    // For Travis CI service
    grunt.registerTask("travis", ["all"]);
    
};
